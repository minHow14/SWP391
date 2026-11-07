// D:/SWP391/SWP391/server/src/repositories/passwordResetOtpRepository.js
import prisma from '../config/prisma.js';

const OTP_SELECT = {
  id: true, userId: true, otpHash: true, tokenVersion: true,
  attempts: true, expiresAt: true, lastSentAt: true, consumedAt: true,
};

export const passwordResetOtpRepository = {
  findByUserId(userId, db = prisma) {
    return db.passwordResetOtp.findUnique({ where: { userId }, select: OTP_SELECT });
  },
  saveChallenge(data, db = prisma) {
    return db.passwordResetOtp.upsert({
      where: { userId: data.userId }, create: data, update: data, select: { id: true },
    });
  },
  recordFailure(id, db = prisma) {
    return db.passwordResetOtp.update({ where: { id }, data: { attempts: { increment: 1 } }, select: { id: true } });
  },
  consumeChallenge({ id, now }, db = prisma) {
    return db.passwordResetOtp.updateMany({ where: { id, consumedAt: null }, data: { consumedAt: now } });
  },
};
