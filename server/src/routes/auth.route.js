// d:\Projects\FPT\SWP391\server\src\routes\auth.route.js
// Router xác thực & hồ sơ cá nhân (/api/v1/auth): đăng ký, đăng nhập, token, hồ sơ, cân nặng.
import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { schemas } from '../validators/index.js';

const router = express.Router();

// POST /auth/register — [Công khai, giới hạn tần suất] Đăng ký tài khoản mới.
router.post('/register', authLimiter, validate(schemas.register), authController.register);
// POST /auth/login — [Công khai, giới hạn tần suất] Đăng nhập, cấp access/refresh token.
router.post('/login', authLimiter, validate(schemas.login), authController.login);
// POST /auth/refresh — [Công khai, giới hạn tần suất] Cấp lại access token từ refresh token.
router.post('/refresh', authLimiter, authController.refreshToken);
// POST /auth/logout — [Công khai] Đăng xuất, thu hồi refresh token.
router.post('/logout', authController.logout);
// GET /auth/me — [Đăng nhập] Lấy hồ sơ người dùng hiện tại.
router.get('/me', authenticate, authController.getMe);
// PATCH /auth/me — [Đăng nhập] Cập nhật hồ sơ cá nhân.
router.patch('/me', authenticate, validate(schemas.updateMe), authController.updateMe);
// POST /auth/change-password — [Đăng nhập] Đổi mật khẩu (cần mật khẩu hiện tại).
router.post('/change-password', authenticate, validate(schemas.changePassword), authController.changePassword);
// POST /auth/me/weight — [Đăng nhập] Ghi nhận cân nặng mới vào lịch sử sức khỏe.
router.post('/me/weight', authenticate, validate(schemas.recordWeight), authController.recordWeight);
// GET /auth/me/health-history — [Đăng nhập] Xem lịch sử cân nặng/sức khỏe.
router.get('/me/health-history', authenticate, authController.getHealthHistory);

export default router;
