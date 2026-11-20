// D:/SWP391/SWP391/server/src/services/mailService.js
// Gửi email qua SMTP (hiện dùng cho mã OTP đặt lại mật khẩu).
import nodemailer from 'nodemailer';
import { getPasswordResetConfig } from '../config/passwordResetConfig.js';
import { ApiError } from '../utils/apiError.js';
import { createPasswordResetEmail } from '../templates/passwordResetEmail.js';

// Timeout 10 giây cho mọi giai đoạn SMTP để request đặt lại mật khẩu không bị treo khi máy chủ mail chậm.
const SMTP_TIMEOUT_MS = 10000;

// Lỗi 503 chung khi không gửi được mail, không lộ chi tiết cấu hình SMTP.
function unavailable() {
  return Object.assign(new ApiError(503, 'Dịch vụ đặt lại mật khẩu chưa sẵn sàng. Vui lòng thử lại sau.'), {
    errorCode: 'PASSWORD_RESET_UNAVAILABLE',
  });
}

export const mailService = {
  // Tạo transport và xác minh kết nối SMTP trước khi tạo OTP, để không phát OTP khi chắc chắn không gửi được.
  async ensureAvailable() {
    try {
      const config = getPasswordResetConfig();
      const transport = nodemailer.createTransport({
        host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE,
        requireTLS: true, auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
        connectionTimeout: SMTP_TIMEOUT_MS, greetingTimeout: SMTP_TIMEOUT_MS,
        socketTimeout: SMTP_TIMEOUT_MS, dnsTimeout: SMTP_TIMEOUT_MS,
        // Tắt đọc file/URL trong nội dung mail để tránh bị lợi dụng đọc tệp trên server.
        disableFileAccess: true, disableUrlAccess: true,
      });
      await transport.verify();
      return { transport, from: config.SMTP_FROM, clientUrl: config.CLIENT_URL, ttlMinutes: config.PASSWORD_RESET_TTL_MINUTES };
    } catch {
      throw unavailable();
    }
  },

  // Gửi email chứa OTP đặt lại mật khẩu.
  async sendPasswordReset({ delivery, to, otp }) {
    const result = await delivery.transport.sendMail({
      from: { name: 'ChayXanh', address: delivery.from }, to,
      ...createPasswordResetEmail({ otp }),
    });
    // Chỉ coi là thành công khi máy chủ SMTP chấp nhận đúng địa chỉ người nhận.
    if (!result.accepted?.some((address) => String(address).toLowerCase() === to.toLowerCase())) throw unavailable();
  },
};
