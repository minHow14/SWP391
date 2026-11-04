// D:/SWP391/SWP391/server/src/repositories/user.repository.js
import prisma from '../config/prisma.js';
import { COMMENT_STATUS, POST_STATUS } from '../constants/status.js';

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
  async lockAccount(userId, db = prisma) {
    const [user] = await db.$queryRaw`
      SELECT user_id, email, full_name, role, status, deleted_at
      FROM users WHERE user_id = ${Number(userId)} FOR UPDATE
    `;
    return user || null;
  },

  updateAccountStatus(userId, { status, deletedAt = null }, db = prisma) {
    return db.user.update({
      where: { user_id: Number(userId) },
      data: { status, deleted_at: deletedAt },
      select: { user_id: true, email: true, full_name: true, role: true, status: true, deleted_at: true },
    });
  },

  async softDeleteAccountContent(userId, deletedAt, db = prisma) {
    // Copy the existing column in the same UPDATE so no moderation state is guessed or read stale.
    await db.$executeRaw`UPDATE comments
      SET status_before_account_deletion = status, status = ${COMMENT_STATUS.DELETED}, deleted_at = ${deletedAt}
      WHERE user_id = ${Number(userId)} AND status <> ${COMMENT_STATUS.DELETED}`;
    await db.$executeRaw`UPDATE posts
      SET status_before_account_deletion = status, status = ${POST_STATUS.DELETED}, deleted_at = ${deletedAt}
      WHERE author_id = ${Number(userId)} AND status <> ${POST_STATUS.DELETED}`;
  },

  async restoreAccountContent(userId, deletedAt, db = prisma) {
    const restoredComments = await db.$executeRaw`UPDATE comments
      SET status = status_before_account_deletion, status_before_account_deletion = NULL, deleted_at = NULL
      WHERE user_id = ${Number(userId)} AND status = ${COMMENT_STATUS.DELETED} AND deleted_at = ${deletedAt}
        AND status_before_account_deletion IS NOT NULL AND status_before_account_deletion <> ${COMMENT_STATUS.DELETED}`;
    const restoredPosts = await db.$executeRaw`UPDATE posts
      SET status = status_before_account_deletion, status_before_account_deletion = NULL, deleted_at = NULL
      WHERE author_id = ${Number(userId)} AND status = ${POST_STATUS.DELETED} AND deleted_at = ${deletedAt}
        AND status_before_account_deletion IS NOT NULL AND status_before_account_deletion <> ${POST_STATUS.DELETED}`;
    const skippedComments = await db.comment.count({
      where: { user_id: Number(userId), status: COMMENT_STATUS.DELETED, deleted_at: deletedAt },
    });
    const skippedPosts = await db.post.count({
      where: { author_id: Number(userId), status: POST_STATUS.DELETED, deleted_at: deletedAt },
    });
    return { restoredPosts, restoredComments, skippedPosts, skippedComments };
  },

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

  findLatestHealthHistory(userId, db = prisma) {
    return db.healthHistory.findFirst({
      where: { user_id: Number(userId) },
      orderBy: { history_id: 'desc' },
      select: { weight: true },
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
