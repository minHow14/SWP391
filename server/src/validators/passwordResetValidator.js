// D:/SWP391/SWP391/server/src/validators/passwordResetValidator.js
import { z } from 'zod';

const MAX_BCRYPT_PASSWORD_BYTES = 72;

export const forgotPasswordSchema = z.object({ email: z.string().trim().email().max(255) }).strict();
export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'Liên kết đặt lại mật khẩu không hợp lệ.'),
  newPassword: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.').max(128)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= MAX_BCRYPT_PASSWORD_BYTES, 'Mật khẩu vượt quá giới hạn 72 byte UTF-8.'),
}).strict();
