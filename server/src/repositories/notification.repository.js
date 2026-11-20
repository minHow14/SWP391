// d:\Projects\FPT\SWP391\server\src\repositories\notification.repository.js
// Repository truy cập bảng thông báo của người dùng.
import prisma from '../config/prisma.js';

export const notificationRepository = {
  // Lấy thông báo của người dùng, mới nhất trước; is_read có thể đến từ query string nên chấp nhận cả 'true'.
  async findManyByUserId(userId, { skip = 0, take = 10, is_read = undefined } = {}, db = prisma) {
    const where = {
      user_id: Number(userId),
      ...(is_read !== undefined ? { is_read: is_read === true || is_read === 'true' } : {}),
    };

    return db.notification.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
    });
  },

  // Đếm thông báo của người dùng (tùy chọn lọc theo đã đọc/chưa đọc).
  async countByUserId(userId, { is_read = undefined } = {}, db = prisma) {
    const where = {
      user_id: Number(userId),
      ...(is_read !== undefined ? { is_read: is_read === true || is_read === 'true' } : {}),
    };

    return db.notification.count({ where });
  },

  // Tạo thông báo mới (mặc định chưa đọc).
  async create({ user_id, content }, db = prisma) {
    return db.notification.create({
      data: {
        user_id: Number(user_id),
        content: String(content).trim(),
        is_read: false,
      },
    });
  },

  // Tìm thông báo theo ID.
  async findById(notificationId, db = prisma) {
    return db.notification.findUnique({
      where: { notification_id: Number(notificationId) },
    });
  },

  // Đánh dấu đã đọc; lọc thêm user_id để người dùng không thao tác được thông báo của người khác.
  async markAsRead(notificationId, userId, db = prisma) {
    return db.notification.updateMany({
      where: {
        notification_id: Number(notificationId),
        user_id: Number(userId),
      },
      data: { is_read: true },
    });
  },

  // Đánh dấu tất cả thông báo chưa đọc của người dùng là đã đọc.
  async markAllAsRead(userId, db = prisma) {
    return db.notification.updateMany({
      where: {
        user_id: Number(userId),
        is_read: false,
      },
      data: { is_read: true },
    });
  },

  // Xóa thông báo của chính người dùng (deleteMany để lọc kèm user_id).
  async delete(notificationId, userId, db = prisma) {
    return db.notification.deleteMany({
      where: {
        notification_id: Number(notificationId),
        user_id: Number(userId),
      },
    });
  },
};
