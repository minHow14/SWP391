// d:\Projects\FPT\SWP391\server\src/repositories/user.repository.js
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

  async findWithPasswordById(userId, db = prisma) {
    return db.user.findUnique({
      where: { user_id: Number(userId) },
      select: {
        ...DEFAULT_USER_SAFE_SELECT,
        password_hash: true,
      },
    });
  },

  async updatePassword(userId, password_hash, db = prisma) {
    return db.user.update({
      where: { user_id: Number(userId) },
      data: { password_hash },
      select: DEFAULT_USER_SAFE_SELECT,
    });
  },

  async addHealthHistory(userId, { weight, bmi, recorded_date }, db = prisma) {
    return db.healthHistory.create({
      data: {
        user_id: Number(userId),
        weight: Number(weight),
        bmi: bmi !== undefined && bmi !== null ? Number(bmi) : null,
        ...(recorded_date ? { recorded_date: new Date(recorded_date) } : {}),
      },
    });
  },

  async getHealthHistories(userId, db = prisma) {
    return db.healthHistory.findMany({
      where: { user_id: Number(userId) },
      orderBy: [{ recorded_date: 'desc' }, { history_id: 'desc' }],
    });
  },

  async findHealthProfile(userId, db = prisma) {
    return db.healthProfile.findUnique({
      where: { user_id: Number(userId) },
      include: { diet_type: true },
    });
  },

  async upsertProfilePreference(userId, goal, db = prisma) {
    const numericUserId = Number(userId);
    return db.profilePreference.upsert({
      where: { user_id: numericUserId },
      create: { user_id: numericUserId, goal },
      update: { goal },
    });
  },

  async countDeleted(db = prisma) {
    return db.user.count({ where: { status: 'DELETED' } });
  },

  async countExpiredDeleted(threshold, db = prisma) {
    return db.user.count({ where: { status: 'DELETED', deleted_at: { lte: threshold } } });
  },

  async findPendingPurgeUsers(limit = 10, db = prisma) {
    return db.user.findMany({
      where: { status: 'DELETED' },
      select: { user_id: true, full_name: true, email: true, deleted_at: true },
      take: limit,
      orderBy: { deleted_at: 'asc' },
    });
  },

  async findExpiredDeletedUserIds(threshold, db = prisma) {
    return db.user.findMany({
      where: { status: 'DELETED', deleted_at: { lte: threshold } },
      select: { user_id: true },
    });
  },

  async deleteUsersByIds(userIds, db = prisma) {
    return db.user.deleteMany({
      where: { user_id: { in: userIds } },
    });
  },
};
