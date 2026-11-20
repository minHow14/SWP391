// D:/SWP391/SWP391/server/src/repositories/passwordResetOtpRepository.js
// Repository lưu trữ mã OTP đặt lại mật khẩu (mỗi người dùng chỉ có một challenge hiện hành).
import prisma from '../config/prisma.js';

// Chỉ chọn các cột cần cho luồng OTP; `otpHash` lưu dạng băm, không bao giờ lưu OTP thô.
const OTP_SELECT = {
  id: true, userId: true, otpHash: true, tokenVersion: true,
  attempts: true, expiresAt: true, lastSentAt: true, consumedAt: true,
};

export const passwordResetOtpRepository = {
  // Lấy challenge OTP hiện tại của người dùng.
  findByUserId(userId, db = prisma) {
    return db.passwordResetOtp.findUnique({ where: { userId }, select: OTP_SELECT });
  },
  // Tạo mới hoặc ghi đè challenge: gửi OTP mới sẽ thay thế OTP cũ để chỉ mã mới nhất còn hiệu lực.
  saveChallenge(data, db = prisma) {
    return db.passwordResetOtp.upsert({
      where: { userId: data.userId }, create: data, update: data, select: { id: true },
    });
  },
  // Tăng số lần nhập sai để giới hạn brute-force OTP.
  recordFailure(id, db = prisma) {
    return db.passwordResetOtp.update({ where: { id }, data: { attempts: { increment: 1 } }, select: { id: true } });
  },
  // Đánh dấu OTP đã dùng; điều kiện `consumedAt: null` đảm bảo chỉ một request dùng được mã (chống race).
  consumeChallenge({ id, now }, db = prisma) {
    return db.passwordResetOtp.updateMany({ where: { id, consumedAt: null }, data: { consumedAt: now } });
  },
};
