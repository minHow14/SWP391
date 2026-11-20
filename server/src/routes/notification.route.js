// d:\Projects\FPT\SWP391\server\src\routes\notification.route.js
// Router thông báo của người dùng (/api/v1/notifications).
import express from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { notificationQuerySchema } from '../validators/notification.validator.js';
import { idParamsSchema } from '../validators/common.validator.js';

const router = express.Router();

// Tất cả các endpoint thông báo bắt buộc xác thực JWT
router.use(authenticate);

// GET /notifications — [Đăng nhập] Danh sách thông báo của tôi (lọc chưa đọc, phân trang).
router.get('/', validate(notificationQuerySchema, 'query'), notificationController.getNotifications);
// PATCH /notifications/read-all — [Đăng nhập] Đánh dấu tất cả là đã đọc.
router.patch('/read-all', notificationController.markAllAsRead);
// PATCH /notifications/:id/read — [Đăng nhập, chủ thông báo] Đánh dấu một thông báo đã đọc.
router.patch('/:id/read', validate(idParamsSchema, 'params'), notificationController.markAsRead);
// DELETE /notifications/:id — [Đăng nhập, chủ thông báo] Xóa thông báo.
router.delete('/:id', validate(idParamsSchema, 'params'), notificationController.deleteNotification);

export default router;
