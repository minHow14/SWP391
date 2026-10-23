// d:\Projects\FPT\SWP391\server\src\controllers\auth.controller.js
import { authService } from '../services/auth.service.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

const setRefreshTokenCookie = (res, refreshToken) => {
  if (!refreshToken) return;
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
    path: '/api',
  });
};

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  setRefreshTokenCookie(res, result.refreshToken);
  return sendCreated(res, result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  setRefreshTokenCookie(res, result.refreshToken);
  return sendSuccess(res, result);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const result = await authService.refreshToken(rawToken);
  return sendSuccess(res, result);
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api',
  });
  return sendSuccess(res, { message: 'Đăng xuất thành công' });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.user_id);
  return sendSuccess(res, { user });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateMe(req.user.user_id, req.body);
  return sendSuccess(res, { user });
});

