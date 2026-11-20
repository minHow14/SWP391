// D:/SWP391/SWP391/server/src/controllers/passwordResetController.js
// Controller quên/đặt lại mật khẩu qua OTP. Mọi response đặt Cache-Control: no-store
// để trình duyệt/proxy không lưu lại dữ liệu nhạy cảm (OTP, token đặt lại).
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { passwordResetService } from '../services/passwordResetService.js';
import { passwordResetOtpService } from '../services/passwordResetOtpService.js';

// Gửi OTP đặt lại mật khẩu về email.
export const forgotPassword = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  return sendSuccess(res, await passwordResetService.requestReset(req.body));
});
// Xác minh OTP người dùng nhập.
export const verifyPasswordResetOtp = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  return sendSuccess(res, await passwordResetOtpService.verifyOtp(req.body));
});
// Đặt mật khẩu mới; xóa cookie refresh token để buộc đăng nhập lại bằng mật khẩu mới.
export const resetPassword = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const result = await passwordResetService.resetPassword(req.body);
  res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api' });
  return sendSuccess(res, result);
});
