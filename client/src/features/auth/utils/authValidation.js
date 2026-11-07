// D:/SWP391/SWP391/client/src/features/auth/utils/authValidation.js
import { z } from 'zod';

const MAX_PASSWORD_BYTES = 72;
const email = z.string().trim().email('Vui lòng nhập email hợp lệ.').max(255, 'Email không được quá 255 ký tự.');
const newPassword = z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.').max(128, 'Mật khẩu không được quá 128 ký tự.')
  .refine((value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES, 'Mật khẩu không được vượt quá 72 byte UTF-8.');

export const forgotPasswordSchema = z.object({ email });
export const passwordResetOtpSchema = z.object({
  otp: z.string().transform((value) => value.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{6}$/, 'Mã OTP phải gồm đúng 6 chữ số.')),
});
export const passwordResetSchema = z.object({ newPassword, confirmNewPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới.') })
  .refine((values) => values.newPassword === values.confirmNewPassword, { path: ['confirmNewPassword'], message: 'Mật khẩu xác nhận không khớp.' });
export const loginSchema = z.object({ email, password: z.string().min(1, 'Vui lòng nhập mật khẩu.').max(128), remember: z.boolean() });
export const registrationSchema = z.object({ email, password: newPassword,
  full_name: z.string().trim().min(1, 'Vui lòng nhập họ và tên.').max(255),
  agreement: z.literal(true, { error: 'Vui lòng đồng ý với điều khoản và chính sách bảo mật.' }),
});

export function getPasswordResetToken(hash) {
  if (!hash?.startsWith('#')) return '';
  const tokens = new URLSearchParams(hash.slice(1)).getAll('token');
  return tokens.length === 1 && /^[a-f0-9]{64}$/i.test(tokens[0]) ? tokens[0] : '';
}
