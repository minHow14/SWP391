// d:\Projects\FPT\SWP391\server\src\repositories\category.repository.js
import prisma from '../config/prisma.js';

export const categoryRepository = {
  async findMany(args = {}, db = prisma) {
    return db.category.findMany(args);
  },

  async findById(categoryId, db = prisma) {
    return db.category.findUnique({
      where: { category_id: Number(categoryId) },
    });
  },

  async findByName(name, db = prisma) {
    return db.category.findUnique({
      where: { name },
    });
  },

  async findFirst(args = {}, db = prisma) {
    return db.category.findFirst(args);
  },

  async create(data, db = prisma) {
    return db.category.create({ data });
  },

  async update(categoryId, data, db = prisma) {
    return db.category.update({
      where: { category_id: Number(categoryId) },
      data,
    });
  },

  async delete(categoryId, db = prisma) {
    return db.category.delete({
      where: { category_id: Number(categoryId) },
    });
  },

  async count(args = {}, db = prisma) {
    return db.category.count(args);
  },

  async countRecipesByCategoryId(categoryId, db = prisma) {
    return db.recipe.count({
      where: { category_id: Number(categoryId) },
    });
  },
};
