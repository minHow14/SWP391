// d:\Projects\FPT\SWP391\server\src\middlewares\authMiddleware.js
import { authService } from '../services/auth.service.js';
import { ApiError } from '../utils/apiError.js';

export const authenticate = async (req, res, next) => {
  try {
    req.user = await authService.authenticate(req.headers.authorization);
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized('Chưa xác thực danh tính'));
  if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('Bạn không có quyền hạn truy cập tài nguyên này'));
  }
  next();
};

export const optionalAuthenticate = (req, res, next) => {
  if (req.headers.authorization !== undefined) return authenticate(req, res, next);
  next();
};
