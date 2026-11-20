// D:/SWP391/SWP391/server/src/services/passwordResetService.js
// Nghiệp vụ đặt lại mật khẩu bằng token: kiểm tra token, đổi mật khẩu và vô hiệu hóa phiên cũ.
import { createHash } from 'node:crypto';
import { passwordResetRepository as repository } from '../repositories/passwordResetRepository.js';
import { passwordResetOtpService } from './passwordResetOtpService.js';
import { hashPassword } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';

// Chỉ lưu và so khớp băm SHA-256 của token để lộ DB cũng không dùng được token.
const digest = (token) => createHash('sha256').update(token).digest('hex');
// Mọi lỗi token đều trả cùng một thông báo để không tiết lộ token tồn tại, hết hạn hay đã dùng.
const invalidToken = () => Object.assign(ApiError.badRequest('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'), { errorCode: 'PASSWORD_RESET_TOKEN_INVALID' });

// Tiêu thụ token và đổi mật khẩu trong một transaction.
async function consumeAndChangePassword({ tokenHash, passwordHash }, db) {
  const reset = await repository.findToken(tokenHash, db);
  if (!reset || reset.consumedAt || reset.expiresAt <= new Date()) throw invalidToken();
  // Khóa dòng người dùng để hai request reset đồng thời không cùng đổi mật khẩu.
  await repository.lockUser(reset.userId, db);
  const now = new Date();
  // Cập nhật có điều kiện theo tokenVersion: nếu người dùng đã đổi mật khẩu/đăng xuất ở nơi khác thì token cũ mất hiệu lực.
  const consumed = await repository.consumeToken({ tokenHash, tokenVersion: reset.tokenVersion, now }, db);
  if (consumed.count !== 1) throw invalidToken();
  await repository.changePassword({ userId: reset.userId, passwordHash }, db);
  // Hủy mọi token reset còn lại để link cũ trong email không dùng lại được.
  await repository.invalidateUserTokens({ userId: reset.userId, now }, db);
}

export const passwordResetService = {
  // Yêu cầu reset được xử lý bằng luồng OTP qua email.
  requestReset: passwordResetOtpService.requestReset,
  // Đặt lại mật khẩu: băm mật khẩu trước transaction để không giữ khóa DB trong lúc bcrypt chạy.
  async resetPassword({ token, newPassword }) {
    const passwordHash = await hashPassword(newPassword);
    const tokenHash = digest(token);
    await repository.transaction((db) => consumeAndChangePassword({ tokenHash, passwordHash }, db));
    return { message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.' };
  },
};
