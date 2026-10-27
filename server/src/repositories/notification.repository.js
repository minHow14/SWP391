// d:\Projects\FPT\SWP391\server\src\repositories\notification.repository.js
import prisma from '../config/prisma.js';

export const notificationRepository = {
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

  async countByUserId(userId, { is_read = undefined } = {}, db = prisma) {
    const where = {
      user_id: Number(userId),
      ...(is_read !== undefined ? { is_read: is_read === true || is_read === 'true' } : {}),
    };

    return db.notification.count({ where });
  },

  async create({ user_id, content }, db = prisma) {
    return db.notification.create({
      data: {
        user_id: Number(user_id),
        content: String(content).trim(),
        is_read: false,
      },
    });
  },

  async findById(notificationId, db = prisma) {
    return db.notification.findUnique({
      where: { notification_id: Number(notificationId) },
    });
  },

  async markAsRead(notificationId, userId, db = prisma) {
    return db.notification.updateMany({
      where: {
        notification_id: Number(notificationId),
        user_id: Number(userId),
      },
      data: { is_read: true },
    });
  },

  async markAllAsRead(userId, db = prisma) {
    return db.notification.updateMany({
      where: {
        user_id: Number(userId),
        is_read: false,
      },
      data: { is_read: true },
    });
  },

  async delete(notificationId, userId, db = prisma) {
    return db.notification.deleteMany({
      where: {
        notification_id: Number(notificationId),
        user_id: Number(userId),
      },
    });
  },
};
