// d:\Projects\FPT\SWP391\server\src\repositories\comment.repository.js
import prisma from '../config/prisma.js';

export const commentRepository = {
  async create(data, include = null, db = prisma) {
    return db.comment.create({
      data,
      ...(include ? { include } : {}),
    });
  },

  async findById(commentId, include = null, db = prisma) {
    return db.comment.findUnique({
      where: { comment_id: Number(commentId) },
      ...(include ? { include } : {}),
    });
  },

  async findMany(args = {}, db = prisma) {
    return db.comment.findMany(args);
  },

  async update(commentId, data, include = null, db = prisma) {
    return db.comment.update({
      where: { comment_id: Number(commentId) },
      data,
      ...(include ? { include } : {}),
    });
  },

  async updateMany(where, data, db = prisma) {
    return db.comment.updateMany({
      where,
      data,
    });
  },

  async count(args = {}, db = prisma) {
    return db.comment.count(args);
  },

  async countDeleted(db = prisma) {
    return db.comment.count({ where: { status: 'DELETED' } });
  },

  async countExpiredDeleted(threshold, db = prisma) {
    return db.comment.count({ where: { status: 'DELETED', deleted_at: { lte: threshold } } });
  },

  async findExpiredDeletedCommentIds(threshold, db = prisma) {
    return db.comment.findMany({
      where: { status: 'DELETED', deleted_at: { lte: threshold } },
      select: { comment_id: true },
    });
  },

  async deleteCommentsByIds(commentIds, db = prisma) {
    return db.comment.deleteMany({
      where: { comment_id: { in: commentIds } },
    });
  },
};
