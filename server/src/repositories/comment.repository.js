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
};
