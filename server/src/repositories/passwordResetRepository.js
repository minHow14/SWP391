// D:/SWP391/SWP391/server/src/repositories/passwordResetRepository.js
// Repository cho luồng đặt lại mật khẩu bằng token: tìm người dùng, quản lý token và đổi mật khẩu.
import prisma from '../config/prisma.js';
import { USER_STATUS } from '../constants/status.js';

export const passwordResetRepository = {
  // Chạy callback trong transaction.
  transaction(callback, db = prisma) {
    return db.$transaction(callback);
  },
  // Chỉ tìm tài khoản đang hoạt động và chưa bị xóa mềm; tài khoản bị khóa không được đặt lại mật khẩu.
  findActiveUserByEmail(email, db = prisma) {
    return db.user.findFirst({
      where: { email, status: USER_STATUS.ACTIVE, deleted_at: null },
      select: { user_id: true, email: true, tokenVersion: true },
    });
  },
  // Lưu token reset (đã băm).
  createToken(data, db = prisma) {
    return db.passwordResetToken.create({ data, select: { id: true } });
  },
  // Thu hồi token theo hash (dùng khi gửi mail thất bại).
  revokeToken({ tokenHash }, db = prisma) {
    return db.passwordResetToken.deleteMany({ where: { tokenHash } });
  },
  // Tìm token reset theo hash.
  findToken(tokenHash, db = prisma) {
    return db.passwordResetToken.findUnique({
      where: { tokenHash }, select: { userId: true, tokenVersion: true, expiresAt: true, consumedAt: true },
    });
  },
  // Khóa dòng người dùng (SELECT ... FOR UPDATE) để tuần tự hóa các lần đổi mật khẩu đồng thời.
  lockUser(userId, db = prisma) {
    return db.$queryRaw`SELECT user_id FROM users WHERE user_id = ${userId} FOR UPDATE`;
  },
  // Tiêu thụ token có điều kiện: còn hạn, chưa dùng, tokenVersion khớp và tài khoản vẫn hoạt động.
  consumeToken({ tokenHash, tokenVersion, now }, db = prisma) {
    return db.passwordResetToken.updateMany({
      where: { tokenHash, tokenVersion, consumedAt: null, expiresAt: { gt: now },
        user: { is: { status: USER_STATUS.ACTIVE, deleted_at: null, tokenVersion } } },
      data: { consumedAt: now },
    });
  },
  // Đổi mật khẩu và tăng tokenVersion để vô hiệu hóa mọi JWT/phiên đã cấp trước đó.
  changePassword({ userId, passwordHash }, db = prisma) {
    return db.user.update({ where: { user_id: userId },
      data: { password_hash: passwordHash, tokenVersion: { increment: 1 } }, select: { user_id: true } });
  },
  // Đánh dấu mọi token reset chưa dùng của người dùng là đã dùng.
  invalidateUserTokens({ userId, now }, db = prisma) {
    return db.passwordResetToken.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: now } });
  },
};
