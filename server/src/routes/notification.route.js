// d:\Projects\FPT\SWP391\server\src\routes\notification.route.js
import express from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { notificationQuerySchema } from '../validators/notification.validator.js';
import { idParamsSchema } from '../validators/common.validator.js';

const router = express.Router();

// Tất cả các endpoint thông báo bắt buộc xác thực JWT
router.use(authenticate);

router.get('/', validate(notificationQuerySchema, 'query'), notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', validate(idParamsSchema, 'params'), notificationController.markAsRead);

export default router;
