// d:\Projects\FPT\SWP391\server\src\repositories\category.repository.js
// Repository truy cập bảng danh mục (category) cho bài viết/công thức.
import prisma from '../config/prisma.js';

export const categoryRepository = {
  // Lấy danh sách danh mục theo tham số Prisma tùy ý.
  async findMany(args = {}, db = prisma) {
    return db.category.findMany(args);
  },

  // Tìm danh mục theo ID (ép kiểu số vì ID có thể đến từ URL dạng chuỗi).
  async findById(categoryId, db = prisma) {
    return db.category.findUnique({
      where: { category_id: Number(categoryId) },
    });
  },

  // Tìm danh mục theo tên (tên là duy nhất).
  async findByName(name, db = prisma) {
    return db.category.findUnique({
      where: { name },
    });
  },

  // Tìm danh mục đầu tiên khớp điều kiện.
  async findFirst(args = {}, db = prisma) {
    return db.category.findFirst(args);
  },

  // Tạo danh mục mới.
  async create(data, db = prisma) {
    return db.category.create({ data });
  },

  // Cập nhật danh mục theo ID.
  async update(categoryId, data, db = prisma) {
    return db.category.update({
      where: { category_id: Number(categoryId) },
      data,
    });
  },

  // Xóa danh mục theo ID.
  async delete(categoryId, db = prisma) {
    return db.category.delete({
      where: { category_id: Number(categoryId) },
    });
  },

  // Đếm số danh mục khớp điều kiện.
  async count(args = {}, db = prisma) {
    return db.category.count(args);
  },
};
