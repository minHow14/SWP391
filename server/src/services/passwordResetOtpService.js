// D:/SWP391/SWP391/server/src/services/passwordResetOtpService.js
// Luồng quên mật khẩu bằng OTP qua email: phát OTP, xác minh OTP và cấp token đặt lại mật khẩu ngắn hạn.
import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import config from '../config/index.js';
import {
  PASSWORD_RESET_OTP_DIGITS, PASSWORD_RESET_OTP_TTL_MINUTES, PASSWORD_RESET_TOKEN_TTL_MINUTES,
  PASSWORD_RESET_OTP_MAX_ATTEMPTS, PASSWORD_RESET_OTP_RESEND_SECONDS, SECONDS_PER_MINUTE, MILLISECONDS_PER_SECOND,
} from '../constants/passwordReset.js';
import { passwordResetRepository as repository } from '../repositories/passwordResetRepository.js';
import { passwordResetOtpRepository as otpRepository } from '../repositories/passwordResetOtpRepository.js';
import { mailService } from './mailService.js';
import { ApiError } from '../utils/apiError.js';
import logger from '../config/logger.js';

// Độ dài token đặt lại mật khẩu (32 byte ngẫu nhiên).
const RESET_TOKEN_BYTES = 32;
// Luôn trả cùng một thông báo dù email có tồn tại hay không để chống dò tìm tài khoản.
const REQUEST_RESULT = {
  message: 'Nếu email khớp với tài khoản đang hoạt động, bạn sẽ nhận được mã xác minh để đặt lại mật khẩu.',
  data: { expiresInSeconds: PASSWORD_RESET_OTP_TTL_MINUTES * SECONDS_PER_MINUTE, resendAfterSeconds: PASSWORD_RESET_OTP_RESEND_SECONDS },
};
// Băm OTP bằng HMAC với secret của server và gắn userId, để lộ DB cũng không dò ngược được OTP 6 chữ số.
const otpDigest = ({ userId, otp }) => createHmac('sha256', config.jwt.secret)
  .update(`password-reset-otp:${userId}:${otp}`).digest('hex');
// Tính thời điểm hết hạn sau `minutes` phút.
const expiresInMinutes = (now, minutes) => new Date(now.getTime() + minutes * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND);
// Mọi lỗi OTP đều dùng cùng thông báo để không tiết lộ OTP sai, hết hạn hay đã dùng.
const invalidOtp = () => Object.assign(ApiError.badRequest('Mã xác minh không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra hoặc yêu cầu mã mới.'), {
  errorCode: 'PASSWORD_RESET_OTP_INVALID',
});

// Phát challenge OTP mới cho người dùng; trả null khi không được phát (tài khoản đổi trạng thái hoặc gửi lại quá sớm).
async function issueChallenge(user, db) {
  // Khóa người dùng để các yêu cầu gửi OTP đồng thời không tạo nhiều mã.
  await repository.lockUser(user.user_id, db);
  // Đọc lại trong khóa để chắc tài khoản vẫn hoạt động và email vẫn thuộc đúng người dùng.
  const activeUser = await repository.findActiveUserByEmail(user.email, db);
  if (!activeUser || activeUser.user_id !== user.user_id) return null;
  const previous = await otpRepository.findByUserId(user.user_id, db);
  // Giới hạn thời gian gửi lại để chống spam email.
  const now = new Date();
  if (previous && now - previous.lastSentAt < PASSWORD_RESET_OTP_RESEND_SECONDS * MILLISECONDS_PER_SECOND) return null;
  // randomInt dùng nguồn ngẫu nhiên an toàn mật mã; padStart giữ đủ số chữ số kể cả khi có số 0 đứng đầu.
  const otp = String(randomInt(10 ** PASSWORD_RESET_OTP_DIGITS)).padStart(PASSWORD_RESET_OTP_DIGITS, '0');
  // Hủy các token reset cũ để chỉ luồng mới nhất còn hiệu lực.
  await repository.invalidateUserTokens({ userId: user.user_id, now }, db);
  const challenge = await otpRepository.saveChallenge({
    id: randomUUID(), userId: user.user_id, tokenVersion: activeUser.tokenVersion,
    otpHash: otpDigest({ userId: user.user_id, otp }), attempts: 0, consumedAt: null,
    expiresAt: expiresInMinutes(now, PASSWORD_RESET_OTP_TTL_MINUTES), lastSentAt: now,
  }, db);
  return { id: challenge.id, otp };
}

// Gửi email chứa OTP; gửi thất bại thì vô hiệu hóa chính challenge đó và chỉ ghi log (không báo cho client để chống dò email).
async function deliverChallenge({ user, delivery, challenge }) {
  try {
    await mailService.sendPasswordReset({ delivery, to: user.email, otp: challenge.otp });
  } catch {
    // Lỗi đến muộn của một email cũ không bao giờ được vô hiệu hóa mã thay thế mới hơn (nên tiêu thụ theo đúng id).
    await otpRepository.consumeChallenge({ id: challenge.id, now: new Date() });
    logger.warn({ errorCode: 'PASSWORD_RESET_DELIVERY_FAILED' }, 'Không thể gửi email đặt lại mật khẩu.');
  }
}

// Challenge còn dùng được: chưa dùng, chưa hết hạn, tokenVersion khớp (chưa đổi mật khẩu) và chưa vượt số lần nhập sai.
function isUsableChallenge({ user, challenge, now }) {
  return challenge && !challenge.consumedAt && challenge.expiresAt > now
    && challenge.tokenVersion === user.tokenVersion && challenge.attempts < PASSWORD_RESET_OTP_MAX_ATTEMPTS;
}

// Xác minh OTP; đúng thì tiêu thụ OTP và cấp token đặt lại mật khẩu, sai thì tăng số lần thử.
async function verifyChallenge({ user, otp }, db) {
  await repository.lockUser(user.user_id, db);
  const activeUser = await repository.findActiveUserByEmail(user.email, db);
  if (!activeUser || activeUser.user_id !== user.user_id) return null;
  const challenge = await otpRepository.findByUserId(user.user_id, db);
  const now = new Date();
  if (!isUsableChallenge({ user: activeUser, challenge, now })) return null;
  // So sánh thời gian hằng (timingSafeEqual) để chống tấn công đo thời gian.
  const received = Buffer.from(otpDigest({ userId: user.user_id, otp }), 'hex');
  if (!timingSafeEqual(Buffer.from(challenge.otpHash, 'hex'), received)) {
    await otpRepository.recordFailure(challenge.id, db);
    return null;
  }
  // Tiêu thụ có điều kiện để một OTP chỉ đổi được một token kể cả khi gửi đồng thời.
  const consumed = await otpRepository.consumeChallenge({ id: challenge.id, now }, db);
  if (consumed.count !== 1) return null;
  await repository.invalidateUserTokens({ userId: user.user_id, now }, db);
  // Token trả cho client ở dạng thô, DB chỉ lưu băm SHA-256.
  const token = randomBytes(RESET_TOKEN_BYTES).toString('hex');
  await repository.createToken({
    userId: user.user_id, tokenVersion: activeUser.tokenVersion,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: expiresInMinutes(now, PASSWORD_RESET_TOKEN_TTL_MINUTES),
  }, db);
  return { token, expiresInSeconds: PASSWORD_RESET_TOKEN_TTL_MINUTES * SECONDS_PER_MINUTE };
}

export const passwordResetOtpService = {
  // Yêu cầu gửi OTP: kiểm tra SMTP trước, email được chuẩn hóa chữ thường; luôn trả cùng một kết quả.
  async requestReset({ email }) {
    const delivery = await mailService.ensureAvailable();
    const user = await repository.findActiveUserByEmail(email.trim().toLowerCase());
    if (!user) return REQUEST_RESULT;
    const challenge = await repository.transaction((db) => issueChallenge(user, db));
    if (challenge) await deliverChallenge({ user, delivery, challenge });
    return REQUEST_RESULT;
  },
  // Xác minh OTP và trả token đặt lại mật khẩu.
  async verifyOtp({ email, otp }) {
    const user = await repository.findActiveUserByEmail(email.trim().toLowerCase());
    const data = user ? await repository.transaction((db) => verifyChallenge({ user, otp }, db)) : null;
    // Ném lỗi sau khi commit để lần đoán sai vẫn được tính vào giới hạn số lần thử.
    if (!data) throw invalidOtp();
    return { message: 'Đã xác minh email. Vui lòng đặt mật khẩu mới.', data };
  },
};
