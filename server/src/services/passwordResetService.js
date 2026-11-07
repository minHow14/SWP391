// D:/SWP391/SWP391/server/src/services/passwordResetService.js
import { createHash } from 'node:crypto';
import { passwordResetRepository as repository } from '../repositories/passwordResetRepository.js';
import { passwordResetOtpService } from './passwordResetOtpService.js';
import { hashPassword } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';

const digest = (token) => createHash('sha256').update(token).digest('hex');
const invalidToken = () => Object.assign(ApiError.badRequest('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'), { errorCode: 'PASSWORD_RESET_TOKEN_INVALID' });

async function consumeAndChangePassword({ tokenHash, passwordHash }, db) {
  const reset = await repository.findToken(tokenHash, db);
  if (!reset || reset.consumedAt || reset.expiresAt <= new Date()) throw invalidToken();
  await repository.lockUser(reset.userId, db);
  const now = new Date();
  const consumed = await repository.consumeToken({ tokenHash, tokenVersion: reset.tokenVersion, now }, db);
  if (consumed.count !== 1) throw invalidToken();
  await repository.changePassword({ userId: reset.userId, passwordHash }, db);
  await repository.invalidateUserTokens({ userId: reset.userId, now }, db);
}

export const passwordResetService = {
  requestReset: passwordResetOtpService.requestReset,
  async resetPassword({ token, newPassword }) {
    const passwordHash = await hashPassword(newPassword);
    const tokenHash = digest(token);
    await repository.transaction((db) => consumeAndChangePassword({ tokenHash, passwordHash }, db));
    return { message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.' };
  },
};
