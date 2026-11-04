// D:/SWP391/SWP391/server/src/controllers/passwordResetController.js
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { passwordResetService } from '../services/passwordResetService.js';

export const forgotPassword = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  return sendSuccess(res, await passwordResetService.requestReset(req.body));
});
export const resetPassword = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const result = await passwordResetService.resetPassword(req.body);
  res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api' });
  return sendSuccess(res, result);
});
