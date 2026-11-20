// D:/SWP391/SWP391/server/src/config/passwordResetConfig.js
// Cấu hình SMTP và thời hạn liên kết đặt lại mật khẩu.
import { z } from 'zod';

// Schema kiểm tra cấu hình SMTP; regex host chặn ký tự lạ để tránh chèn cấu hình.
const passwordResetConfigSchema = z.object({
  SMTP_HOST: z.string().trim().min(1).regex(/^[a-zA-Z0-9.-]+$/),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().trim().email().max(255),
  // CLIENT_URL dùng để tạo liên kết đặt lại: bắt buộc HTTPS (trừ localhost) và không chứa thông tin đăng nhập trong URL.
  CLIENT_URL: z.string().url().refine((value) => {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return !url.username && !url.password && (url.protocol === 'https:' || (url.protocol === 'http:' && local));
  }),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
});

// Đọc cấu hình mỗi lần gọi (không cache) để thiếu cấu hình chỉ làm lỗi tính năng khôi phục mật khẩu chứ không chặn server khởi động.
export function getPasswordResetConfig() {
  return passwordResetConfigSchema.parse(process.env);
}
