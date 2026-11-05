// D:/SWP391/SWP391/server/src/services/passwordResetService.js
import { createHash, randomBytes } from 'node:crypto';
import { passwordResetRepository as repository } from '../repositories/passwordResetRepository.js';
import { mailService } from './mailService.js';
import { hashPassword } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';
import logger from '../config/logger.js';

const TOKEN_BYTES = 32;
const MILLISECONDS_PER_MINUTE = 60000;
const REQUEST_MESSAGE = 'Nếu email khớp với tài khoản đang hoạt động, hệ thống sẽ xử lý yêu cầu đặt lại mật khẩu.';
const digest = (token) => createHash('sha256').update(token).digest('hex');
const invalidToken = () => Object.assign(ApiError.badRequest('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'), { errorCode: 'PASSWORD_RESET_TOKEN_INVALID' });

async function deliverReset({ user, delivery, token }) {
  const tokenHash = digest(token);
  const expiresAt = new Date(Date.now() + delivery.ttlMinutes * MILLISECONDS_PER_MINUTE);
  await repository.createToken({ userId: user.user_id, tokenVersion: user.tokenVersion, tokenHash, expiresAt });
  const resetUrl = new URL('/dat-lai-mat-khau', delivery.clientUrl);
  resetUrl.hash = new URLSearchParams({ token }).toString();
  try {
    await mailService.sendPasswordReset({ delivery, to: user.email, resetUrl: resetUrl.toString() });
  } catch {
    await repository.revokeToken({ tokenHash });
    logger.warn({ errorCode: 'PASSWORD_RESET_DELIVERY_FAILED' }, 'Không thể gửi email đặt lại mật khẩu.');
  }
}

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
  async requestReset({ email }) {
    const delivery = await mailService.ensureAvailable();
    const user = await repository.findActiveUserByEmail(email.trim().toLowerCase());
    if (user) await deliverReset({ user, delivery, token: randomBytes(TOKEN_BYTES).toString('hex') });
    return { message: REQUEST_MESSAGE };
  },
  async resetPassword({ token, newPassword }) {
    const passwordHash = await hashPassword(newPassword);
    const tokenHash = digest(token);
    await repository.transaction((db) => consumeAndChangePassword({ tokenHash, passwordHash }, db));
    return { message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.' };
  },
};
