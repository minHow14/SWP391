// D:/SWP391/SWP391/server/src/middlewares/aiIdentityMiddleware.js
// Middleware xác định danh tính người gọi tính năng AI: người dùng đã đăng nhập hoặc khách (qua cookie ký số), phục vụ tính hạn mức.
import { optionalAuthenticate } from './authMiddleware.js';
import config from '../config/index.js';
import { AI_GUEST_COOKIE_NAME, AI_GUEST_COOKIE_PATH, LEGACY_AI_GUEST_COOKIE_PATH } from '../constants/guestIdentity.js';
import { guestIdentityService } from '../services/guestIdentityService.js';

// Xác thực tuỳ chọn: có header Authorization thì kiểm tra token, không có thì coi là khách.
export const authenticateAiCaller = optionalAuthenticate;

// Gán req.aiIdentity ({ userId, guestId }); với khách sẽ cấp/làm mới cookie định danh khi cần.
export function resolveAiIdentity(req, res, next) {
  if (req.user) {
    req.aiIdentity = { userId: req.user.user_id, guestId: null };
    return next();
  }
  try {
    const session = guestIdentityService.resolve({ cookieHeader: req.headers.cookie });
    req.aiIdentity = { userId: null, guestId: session.guestId };
    if (session.token) {
      // Cookie httpOnly để JS phía client không đọc được; chỉ bật secure ở production vì local chạy HTTP.
      const options = { httpOnly: true, secure: config.isProduction, sameSite: 'lax' };
      // Xoá cookie phạm vi hẹp (đường dẫn cũ) trước khi đặt cookie thay thế để tương thích với cách trình duyệt lưu cookie.
      res.clearCookie(AI_GUEST_COOKIE_NAME, { ...options, path: LEGACY_AI_GUEST_COOKIE_PATH });
      res.cookie(AI_GUEST_COOKIE_NAME, session.token, {
        ...options, path: AI_GUEST_COOKIE_PATH, expires: session.expiresAt,
      });
    }
    next();
  } catch (error) { next(error); }
}

// Lấy danh tính AI đã được middleware gán vào request.
export const getAiIdentity = (req) => req.aiIdentity;
