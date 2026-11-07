// D:/SWP391/SWP391/server/src/services/passwordResetOtpService.js
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

const RESET_TOKEN_BYTES = 32;
const REQUEST_RESULT = {
  message: 'Nếu email khớp với tài khoản đang hoạt động, bạn sẽ nhận được mã xác minh để đặt lại mật khẩu.',
  data: { expiresInSeconds: PASSWORD_RESET_OTP_TTL_MINUTES * SECONDS_PER_MINUTE, resendAfterSeconds: PASSWORD_RESET_OTP_RESEND_SECONDS },
};
const otpDigest = ({ userId, otp }) => createHmac('sha256', config.jwt.secret)
  .update(`password-reset-otp:${userId}:${otp}`).digest('hex');
const expiresInMinutes = (now, minutes) => new Date(now.getTime() + minutes * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND);
const invalidOtp = () => Object.assign(ApiError.badRequest('Mã xác minh không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra hoặc yêu cầu mã mới.'), {
  errorCode: 'PASSWORD_RESET_OTP_INVALID',
});

async function issueChallenge(user, db) {
  await repository.lockUser(user.user_id, db);
  const activeUser = await repository.findActiveUserByEmail(user.email, db);
  if (!activeUser || activeUser.user_id !== user.user_id) return null;
  const previous = await otpRepository.findByUserId(user.user_id, db);
  const now = new Date();
  if (previous && now - previous.lastSentAt < PASSWORD_RESET_OTP_RESEND_SECONDS * MILLISECONDS_PER_SECOND) return null;
  const otp = String(randomInt(10 ** PASSWORD_RESET_OTP_DIGITS)).padStart(PASSWORD_RESET_OTP_DIGITS, '0');
  await repository.invalidateUserTokens({ userId: user.user_id, now }, db);
  const challenge = await otpRepository.saveChallenge({
    id: randomUUID(), userId: user.user_id, tokenVersion: activeUser.tokenVersion,
    otpHash: otpDigest({ userId: user.user_id, otp }), attempts: 0, consumedAt: null,
    expiresAt: expiresInMinutes(now, PASSWORD_RESET_OTP_TTL_MINUTES), lastSentAt: now,
  }, db);
  return { id: challenge.id, otp };
}

async function deliverChallenge({ user, delivery, challenge }) {
  try {
    await mailService.sendPasswordReset({ delivery, to: user.email, otp: challenge.otp });
  } catch {
    // A delayed failure from an older email must never consume a replacement code.
    await otpRepository.consumeChallenge({ id: challenge.id, now: new Date() });
    logger.warn({ errorCode: 'PASSWORD_RESET_DELIVERY_FAILED' }, 'Không thể gửi email đặt lại mật khẩu.');
  }
}

function isUsableChallenge({ user, challenge, now }) {
  return challenge && !challenge.consumedAt && challenge.expiresAt > now
    && challenge.tokenVersion === user.tokenVersion && challenge.attempts < PASSWORD_RESET_OTP_MAX_ATTEMPTS;
}

async function verifyChallenge({ user, otp }, db) {
  await repository.lockUser(user.user_id, db);
  const activeUser = await repository.findActiveUserByEmail(user.email, db);
  if (!activeUser || activeUser.user_id !== user.user_id) return null;
  const challenge = await otpRepository.findByUserId(user.user_id, db);
  const now = new Date();
  if (!isUsableChallenge({ user: activeUser, challenge, now })) return null;
  const received = Buffer.from(otpDigest({ userId: user.user_id, otp }), 'hex');
  if (!timingSafeEqual(Buffer.from(challenge.otpHash, 'hex'), received)) {
    await otpRepository.recordFailure(challenge.id, db);
    return null;
  }
  const consumed = await otpRepository.consumeChallenge({ id: challenge.id, now }, db);
  if (consumed.count !== 1) return null;
  await repository.invalidateUserTokens({ userId: user.user_id, now }, db);
  const token = randomBytes(RESET_TOKEN_BYTES).toString('hex');
  await repository.createToken({
    userId: user.user_id, tokenVersion: activeUser.tokenVersion,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: expiresInMinutes(now, PASSWORD_RESET_TOKEN_TTL_MINUTES),
  }, db);
  return { token, expiresInSeconds: PASSWORD_RESET_TOKEN_TTL_MINUTES * SECONDS_PER_MINUTE };
}

export const passwordResetOtpService = {
  async requestReset({ email }) {
    const delivery = await mailService.ensureAvailable();
    const user = await repository.findActiveUserByEmail(email.trim().toLowerCase());
    if (!user) return REQUEST_RESULT;
    const challenge = await repository.transaction((db) => issueChallenge(user, db));
    if (challenge) await deliverChallenge({ user, delivery, challenge });
    return REQUEST_RESULT;
  },
  async verifyOtp({ email, otp }) {
    const user = await repository.findActiveUserByEmail(email.trim().toLowerCase());
    const data = user ? await repository.transaction((db) => verifyChallenge({ user, otp }, db)) : null;
    // Throw after commit so a rejected guess still counts toward the attempt limit.
    if (!data) throw invalidOtp();
    return { message: 'Đã xác minh email. Vui lòng đặt mật khẩu mới.', data };
  },
};
