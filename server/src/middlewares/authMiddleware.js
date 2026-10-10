import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';
import prisma from '../config/prisma.js';
import { USER_STATUS } from '../constants/status.js';

/**
 * Middleware bắt buộc xác thực người dùng bằng JWT Bearer Token
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Vui lòng đăng nhập để thực hiện chức năng này');
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token) {
      throw ApiError.unauthorized('Token xác thực không hợp lệ');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
      }
      throw ApiError.unauthorized('Token không hợp lệ hoặc đã bị chỉnh sửa');
    }

    const user = await prisma.user.findUnique({
      where: { user_id: decoded.user_id },
      select: {
        user_id: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw ApiError.unauthorized('Tài khoản không tồn tại trên hệ thống');
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw ApiError.forbidden('Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động');
    }

    // Gắn thông tin người dùng vào request context
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware phân quyền theo Role (RBAC)
 * @param  {...number} allowedRoles - Danh sách roleId được phép truy cập (VD: ROLES.ADMIN)
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Chưa xác thực danh tính'));
    }

    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('Bạn không có quyền hạn truy cập tài nguyên này'));
    }

    next();
  };
};

/**
 * Middleware xác thực tùy chọn (nếu có token thì parse, không có thì vẫn cho qua)
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token) return next();

    try {
      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { user_id: decoded.user_id },
        select: {
          user_id: true,
          email: true,
          full_name: true,
          role: true,
          status: true,
        },
      });

      if (user && user.status === USER_STATUS.ACTIVE) {
        req.user = user;
      }
    } catch {
      // Bỏ qua lỗi token ở chế độ optional
    }

    next();
  } catch {
    next();
  }
};

