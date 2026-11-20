// d:\Projects\FPT\SWP391\server\src\controllers\notification.controller.js
// Controller thông báo của người dùng: xem, đánh dấu đã đọc, xóa.
import { notificationService } from '../services/notification.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

// Danh sách thông báo; nhận cả is_read (client cũ) lẫn isRead (client mới), kèm số chưa đọc.
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

// Đánh dấu một thông báo là đã đọc (chỉ của chính người dùng).
export const markAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markNotificationAsRead(req.params.id, req.user.user_id);
  return sendSuccess(res, {
    message: 'Đã đánh dấu thông báo là đã đọc',
    data: result,
  });
});

// Đánh dấu toàn bộ thông báo của người dùng là đã đọc.
export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllNotificationsAsRead(req.user.user_id);
  return sendSuccess(res, result);
});

// Xóa một thông báo của người dùng.
export const deleteNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.deleteNotification(req.params.id, req.user.user_id);
  return sendSuccess(res, result);
});
