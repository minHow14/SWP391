// client/src/services/notificationService.js
import apiClient from './apiClient.js';

export const notificationService = {
  // Lấy danh sách thông báo kèm số lượng chưa đọc (unreadCount) và phân trang
  getNotifications: (params = {}) =>
    apiClient.get('/v1/notifications', { params }),

  // Đánh dấu một thông báo cụ thể là đã đọc
  markAsRead: (notificationId) =>
    apiClient.patch(`/v1/notifications/${notificationId}/read`),

  // Đánh dấu tất cả thông báo của người dùng là đã đọc
  markAllAsRead: () =>
    apiClient.patch('/v1/notifications/read-all'),

  // Xóa một thông báo
  deleteNotification: (notificationId) =>
    apiClient.delete(`/v1/notifications/${notificationId}`),
};
