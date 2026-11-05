// D:/SWP391/SWP391/server/src/repositories/passwordResetRepository.js
import prisma from '../config/prisma.js';
import { USER_STATUS } from '../constants/status.js';

export const passwordResetRepository = {
  transaction(callback, db = prisma) {
    return db.$transaction(callback);
  },
  findActiveUserByEmail(email, db = prisma) {
    return db.user.findFirst({
      where: { email, status: USER_STATUS.ACTIVE, deleted_at: null },
      select: { user_id: true, email: true, tokenVersion: true },
    });
  },
  createToken(data, db = prisma) {
    return db.passwordResetToken.create({ data, select: { id: true } });
  },
  revokeToken({ tokenHash }, db = prisma) {
    return db.passwordResetToken.deleteMany({ where: { tokenHash } });
  },
  findToken(tokenHash, db = prisma) {
    return db.passwordResetToken.findUnique({
      where: { tokenHash }, select: { userId: true, tokenVersion: true, expiresAt: true, consumedAt: true },
    });
  },
  lockUser(userId, db = prisma) {
    return db.$queryRaw`SELECT user_id FROM users WHERE user_id = ${userId} FOR UPDATE`;
  },
  consumeToken({ tokenHash, tokenVersion, now }, db = prisma) {
    return db.passwordResetToken.updateMany({
      where: { tokenHash, tokenVersion, consumedAt: null, expiresAt: { gt: now },
        user: { is: { status: USER_STATUS.ACTIVE, deleted_at: null, tokenVersion } } },
      data: { consumedAt: now },
    });
  },
  changePassword({ userId, passwordHash }, db = prisma) {
    return db.user.update({ where: { user_id: userId },
      data: { password_hash: passwordHash, tokenVersion: { increment: 1 } }, select: { user_id: true } });
  },
  invalidateUserTokens({ userId, now }, db = prisma) {
    return db.passwordResetToken.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: now } });
  },
};
