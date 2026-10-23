// D:/SWP391/SWP391/server/src/repositories/user.repository.js
import prisma from '../config/prisma.js';

export const DEFAULT_USER_SAFE_SELECT = {
  user_id: true,
  email: true,
  full_name: true,
  role: true,
  status: true,
  created_at: true,
  deleted_at: true,
};

export const userRepository = {
  findAuthIdentityById(userId, db = prisma) {
    return db.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, email: true, full_name: true, role: true, status: true, deleted_at: true },
    });
  },

  async findByEmail(email, select = DEFAULT_USER_SAFE_SELECT, db = prisma) {
    return db.user.findUnique({
      where: { email },
      select,
    });
  },

  async findByEmailWithPassword(email, db = prisma) {
    return db.user.findUnique({
      where: { email },
      select: {
        ...DEFAULT_USER_SAFE_SELECT,
        password_hash: true,
      },
    });
  },

  async findById(userId, select = DEFAULT_USER_SAFE_SELECT, db = prisma) {
    return db.user.findUnique({
      where: { user_id: Number(userId) },
      select,
    });
  },

  async create(data, select = DEFAULT_USER_SAFE_SELECT, db = prisma) {
    return db.user.create({
      data,
      select,
    });
  },

  async update(userId, data, select = DEFAULT_USER_SAFE_SELECT, db = prisma) {
    return db.user.update({
      where: { user_id: Number(userId) },
      data,
      select,
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
    const finalArgs = { ...args };
    if (!finalArgs.select && !finalArgs.include) {
      finalArgs.select = DEFAULT_USER_SAFE_SELECT;
    }
    return db.user.findMany(finalArgs);
  },
};
