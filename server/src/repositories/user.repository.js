// d:\Projects\FPT\SWP391\server\src\repositories\user.repository.js
import prisma from '../config/prisma.js';

export const userRepository = {
  async findByEmail(email, select = null, db = prisma) {
    return db.user.findUnique({
      where: { email },
      ...(select ? { select } : {}),
    });
  },

  async findById(userId, select = null, db = prisma) {
    return db.user.findUnique({
      where: { user_id: Number(userId) },
      ...(select ? { select } : {}),
    });
  },

  async create(data, select = null, db = prisma) {
    return db.user.create({
      data,
      ...(select ? { select } : {}),
    });
  },

  async update(userId, data, select = null, db = prisma) {
    return db.user.update({
      where: { user_id: Number(userId) },
      data,
      ...(select ? { select } : {}),
    });
  },

  async upsertHealthProfile(userId, profile, db = prisma) {
    const numericUserId = Number(userId);
    return db.healthProfile.upsert({
      where: { user_id: numericUserId },
      create: { user_id: numericUserId, ...profile },
      update: profile,
    });
  },

  async replaceAllergies(userId, allergyIds, db = prisma) {
    const numericUserId = Number(userId);
    await db.userAllergy.deleteMany({ where: { user_id: numericUserId } });
    if (allergyIds?.length) {
      await db.userAllergy.createMany({
        data: allergyIds.map((ingredient_id) => ({
          user_id: numericUserId,
          ingredient_id: Number(ingredient_id),
        })),
      });
    }
  },

  async findDietTypeById(dietTypeId, db = prisma) {
    return db.dietType.findUnique({
      where: { diet_type_id: Number(dietTypeId) },
    });
  },

  async countIngredients(ingredientIds, db = prisma) {
    return db.ingredient.count({
      where: { ingredient_id: { in: ingredientIds.map(Number) } },
    });
  },

  async count(args = {}, db = prisma) {
    return db.user.count(args);
  },

  async findMany(args = {}, db = prisma) {
    return db.user.findMany(args);
  },
};
