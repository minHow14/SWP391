// D:/SWP391/SWP391/server/src/repositories/comment.repository.js
// Repository truy cập bảng bình luận, gồm truy vấn phục vụ xóa mềm và dọn dẹp bình luận đã xóa quá hạn.
import prisma from '../config/prisma.js';

export const commentRepository = {
  // Khóa dòng bình luận (SELECT ... FOR UPDATE) để tránh sửa/xóa đồng thời gây sai lệch.
  lockForUpdate(commentId, db = prisma) {
    return db.$queryRaw`SELECT comment_id FROM comments WHERE comment_id = ${commentId} FOR UPDATE`;
  },
  // Tạo bình luận, tùy chọn include quan hệ.
  async create(data, include = null, db = prisma) {
    return db.comment.create({
      data,
      ...(include ? { include } : {}),
    });
  },

  // Tìm bình luận theo ID.
  async findById(commentId, include = null, db = prisma) {
    return db.comment.findUnique({
      where: { comment_id: Number(commentId) },
      ...(include ? { include } : {}),
    });
  },

  // Lấy danh sách bình luận theo tham số Prisma.
  async findMany(args = {}, db = prisma) {
    return db.comment.findMany(args);
  },

  // Cập nhật bình luận theo ID.
  async update(commentId, data, include = null, db = prisma) {
    return db.comment.update({
      where: { comment_id: Number(commentId) },
      data,
      ...(include ? { include } : {}),
    });
  },

  // Cập nhật nhiều bình luận cùng lúc.
  async updateMany(where, data, db = prisma) {
    return db.comment.updateMany({
      where,
      data,
    });
  },

  // Đếm bình luận.
  async count(args = {}, db = prisma) {
    return db.comment.count(args);
  },

  // Đếm bình luận đã xóa mềm.
  async countDeleted(db = prisma) {
    return db.comment.count({ where: { status: 'DELETED' } });
  },

  // Đếm bình luận đã xóa mềm quá ngưỡng thời gian lưu giữ (ứng viên xóa vĩnh viễn).
  async countExpiredDeleted(threshold, db = prisma) {
    return db.comment.count({ where: { status: 'DELETED', deleted_at: { lte: threshold } } });
  },

  // Lấy ID các bình luận đã xóa mềm quá hạn để xóa vĩnh viễn.
  async findExpiredDeletedCommentIds(threshold, db = prisma) {
    return db.comment.findMany({
      where: { status: 'DELETED', deleted_at: { lte: threshold } },
      select: { comment_id: true },
    });
  },

  // Xóa vĩnh viễn bình luận theo danh sách ID.
  async deleteCommentsByIds(commentIds, db = prisma) {
    return db.comment.deleteMany({
      where: { comment_id: { in: commentIds } },
    });
  },
};
