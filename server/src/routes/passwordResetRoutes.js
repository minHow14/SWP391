// D:/SWP391/SWP391/server/src/routes/passwordResetRoutes.js
// Router quên mật khẩu qua OTP email (mount dưới /api/v1/auth). Đều giới hạn tần suất để chống dò OTP/spam email.
import { Router } from 'express';
import { forgotPassword, resetPassword, verifyPasswordResetOtp } from '../controllers/passwordResetController.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { forgotPasswordSchema, resetPasswordSchema, verifyPasswordResetOtpSchema } from '../validators/passwordResetValidator.js';

const router = Router();
// POST /auth/forgot-password — [Công khai] Gửi mã OTP đặt lại mật khẩu về email.
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
// POST /auth/verify-password-reset-otp — [Công khai] Xác minh OTP trước khi cho đặt mật khẩu mới.
router.post('/verify-password-reset-otp', authLimiter, validate(verifyPasswordResetOtpSchema), verifyPasswordResetOtp);
// POST /auth/reset-password — [Công khai] Đặt mật khẩu mới bằng OTP hợp lệ.
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
export default router;
