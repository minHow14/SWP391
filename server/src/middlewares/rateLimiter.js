// d:\Projects\FPT\SWP391\server\src\middlewares\rateLimiter.js
import { rateLimit } from 'express-rate-limit';
import { fail } from '../utils/apiResponse.js';

const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

/**
 * Middleware giới hạn tốc độ truy cập toàn cục cho các API (/api/*)
 * Mặc định: 200 requests / 15 phút cho mỗi IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  handler: (req, res) => {
    return fail(
      res,
      429,
      'RATE_LIMIT_EXCEEDED',
      'Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau ít phút.'
    );
  },
});

/**
 * Middleware giới hạn nghiêm ngặt cho các endpoint xác thực nhạy cảm (/api/auth/login, /api/auth/register)
 * Phòng chống tấn công dò mật khẩu (Brute-force) và spam tài khoản
 * Mặc định: 10 lần thử / 15 phút cho mỗi IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 15),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  handler: (req, res) => {
    return fail(
      res,
      429,
      'AUTH_RATE_LIMIT_EXCEEDED',
      'Đã vượt quá số lần thử đăng nhập/đăng ký cho phép. Vui lòng thử lại sau 15 phút.'
    );
  },
});
