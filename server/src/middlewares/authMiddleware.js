// d:\Projects\FPT\SWP391\server\src\middlewares\authMiddleware.js
// Middleware xác thực JWT và phân quyền theo vai trò.
import { authService } from '../services/auth.service.js';
import { ApiError } from '../utils/apiError.js';

// Bắt buộc đăng nhập: giải mã token từ header Authorization và gán người dùng vào req.user.
export const authenticate = async (req, res, next) => {
  try {
    req.user = await authService.authenticate(req.headers.authorization);
    next();
  } catch (error) {
    next(error);
  }
};

// Phân quyền: chỉ cho phép các vai trò được liệt kê; không truyền vai trò nào thì chỉ cần đã đăng nhập.
export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized('Chưa xác thực danh tính'));
  if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('Bạn không có quyền hạn truy cập tài nguyên này'));
  }
  next();
};

// Xác thực tuỳ chọn: chỉ kiểm tra khi có header Authorization, để route phục vụ được cả khách lẫn người dùng.
export const optionalAuthenticate = (req, res, next) => {
  // Đã gửi header thì token phải hợp lệ; không âm thầm coi token sai là khách.
  if (req.headers.authorization !== undefined) return authenticate(req, res, next);
  next();
};
