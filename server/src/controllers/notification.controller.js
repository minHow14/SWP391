// d:\Projects\FPT\SWP391\server\src\controllers\notification.controller.js
import { notificationService } from '../services/notification.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const isReadParam = req.query.is_read !== undefined ? req.query.is_read : req.query.isRead;
  const result = await notificationService.getUserNotifications(req.user.user_id, {
    page: req.query.page,
    limit: req.query.limit,
    is_read: isReadParam,
  });

  return sendSuccess(res, {
    notifications: result.notifications,
    unreadCount: result.unreadCount,
    meta: result.meta,
  });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markNotificationAsRead(req.params.id, req.user.user_id);
  return sendSuccess(res, {
    message: 'Đã đánh dấu thông báo là đã đọc',
    data: result,
  });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllNotificationsAsRead(req.user.user_id);
  return sendSuccess(res, result);
});
