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

const extractRefreshToken = (req) => {
  if (req.cookies?.refreshToken) return req.cookies.refreshToken;
  if (req.body?.refreshToken) return req.body.refreshToken;
  const cookieHeader = req.headers?.cookie;
  if (typeof cookieHeader === 'string') {
    const match = /(?:^|;\s*)refreshToken=([^;]*)/.exec(cookieHeader);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
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
  const rawToken = extractRefreshToken(req);
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

export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.user_id, req.body);
  return sendSuccess(res, result);
});

export const recordWeight = asyncHandler(async (req, res) => {
  const record = await authService.recordWeight(req.user.user_id, req.body);
  return sendCreated(res, {
    message: 'Ghi nhận cân nặng thành công',
    record,
  });
});

export const getHealthHistory = asyncHandler(async (req, res) => {
  const history = await authService.getHealthHistory(req.user.user_id);
  return sendSuccess(res, history);
});

