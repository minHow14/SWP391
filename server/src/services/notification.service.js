// d:\Projects\FPT\SWP391\server\src\services\notification.service.js
import { notificationRepository } from '../repositories/notification.repository.js';
import { ApiError } from '../utils/apiError.js';

export const notificationService = {
  /**
   * Lấy danh sách thông báo của người dùng kèm phân trang và bóc tách metadata
   */
  async getUserNotifications(userId, { page = 1, limit = 10, is_read = undefined } = {}) {
    const numericPage = Math.max(1, Number(page) || 1);
    const numericLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const skip = (numericPage - 1) * numericLimit;

    const [total, unreadCount, rawNotifications] = await Promise.all([
      notificationRepository.countByUserId(userId, { is_read }),
      notificationRepository.countByUserId(userId, { is_read: false }),
      notificationRepository.findManyByUserId(userId, {
        skip,
        take: numericLimit,
        is_read,
      }),
    ]);

    // Chuẩn hóa định dạng thông báo cho Front-end (title, type, message)
    const notifications = rawNotifications.map((n) => {
      let title = 'Thông báo hệ thống';
      let type = 'SYSTEM';
      const text = n.content || '';

      if (text.toLowerCase().includes('bình luận')) {
        title = 'Bình luận mới';
        type = 'COMMENT';
      } else if (text.toLowerCase().includes('báo cáo')) {
        title = 'Cập nhật báo cáo';
        type = 'REPORT';
      }

      return {
        ...n,
        title,
        type,
        message: text,
      };
    });

    return {
      notifications,
      unreadCount,
      meta: {
        page: numericPage,
        limit: numericLimit,
        total,
        totalPages: Math.ceil(total / numericLimit),
      },
    };
  },

  /**
   * Đánh dấu 1 thông báo là đã đọc
   */
  async markNotificationAsRead(notificationId, userId) {
    const id = Number(notificationId);
    if (!id) throw ApiError.badRequest('Mã thông báo không hợp lệ');

    const notification = await notificationRepository.findById(id);
    if (!notification) throw ApiError.notFound('Không tìm thấy thông báo');
    if (notification.user_id !== Number(userId)) {
      throw ApiError.forbidden('Bạn không có quyền thao tác trên thông báo này');
    }

    await notificationRepository.markAsRead(id, userId);
    return { notification_id: id, is_read: true };
  },

  /**
   * Đánh dấu tất cả thông báo của người dùng là đã đọc
   */
  async markAllNotificationsAsRead(userId) {
    const result = await notificationRepository.markAllAsRead(userId);
    return {
      message: 'Đã đánh dấu tất cả thông báo là đã đọc',
      updatedCount: result.count,
    };
  },

  /**
   * Tạo thông báo mới cho người dùng (Helper nội bộ các service gọi khi có sự kiện)
   */
  async notify({ user_id, content }) {
    if (!user_id || !content) return null;
    try {
      return await notificationRepository.create({
        user_id: Number(user_id),
        content: String(content).trim(),
      });
    } catch {
      // Bỏ qua lỗi thông báo để không làm gián đoạn transaction chính
      return null;
    }
  },
};
