// d:\Projects\FPT\SWP391\server\src\controllers\auth.controller.js
// Controller xác thực: đăng ký, đăng nhập, refresh/logout token và hồ sơ cá nhân.
import { authService } from '../services/auth.service.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

// Lưu refresh token vào cookie httpOnly (JS phía client không đọc được → chống XSS đánh cắp token).
// sameSite strict chống CSRF; path '/api' để cookie chỉ gửi kèm request API.
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

// Lấy refresh token theo thứ tự: cookie đã parse → body → tự parse header Cookie
// (dự phòng khi cookie-parser chưa chạy hoặc client gửi token trong body).
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

// Đăng ký tài khoản, đặt cookie refresh token và trả 201.
export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  setRefreshTokenCookie(res, result.refreshToken);
  return sendCreated(res, result);
});

// Đăng nhập, đặt cookie refresh token.
export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  setRefreshTokenCookie(res, result.refreshToken);
  return sendSuccess(res, result);
});

// Cấp access token mới từ refresh token.
export const refreshToken = asyncHandler(async (req, res) => {
  const rawToken = extractRefreshToken(req);
  const result = await authService.refreshToken(rawToken);
  return sendSuccess(res, result);
});

// Đăng xuất: xóa cookie refresh token với cùng tùy chọn lúc tạo (khác tùy chọn thì trình duyệt không xóa).
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api',
  });
  return sendSuccess(res, { message: 'Đăng xuất thành công' });
});

// Lấy hồ sơ của người dùng đang đăng nhập.
export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.user_id);
  return sendSuccess(res, { user });
});

// Cập nhật hồ sơ của người dùng đang đăng nhập.
export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateMe(req.user.user_id, req.body);
  return sendSuccess(res, { user });
});

// Đổi mật khẩu; service cấp refresh token mới nên đặt lại cookie để phiên hiện tại không bị đăng xuất.
export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.user_id, req.body);
  setRefreshTokenCookie(res, result.refreshToken);
  return sendSuccess(res, result);
});

// Ghi nhận cân nặng mới vào lịch sử sức khỏe.
export const recordWeight = asyncHandler(async (req, res) => {
  const record = await authService.recordWeight(req.user.user_id, req.body);
  return sendCreated(res, {
    message: 'Ghi nhận cân nặng thành công',
    record,
  });
});

// Lấy lịch sử cân nặng/sức khỏe của người dùng.
export const getHealthHistory = asyncHandler(async (req, res) => {
  const history = await authService.getHealthHistory(req.user.user_id);
  return sendSuccess(res, history);
});

