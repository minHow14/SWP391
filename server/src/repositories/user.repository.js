// D:/SWP391/SWP391/server/src/repositories/user.repository.js
// Repository truy cập người dùng: tài khoản, trạng thái khóa/xóa, hồ sơ sức khỏe, dị ứng, lịch sử cân nặng và dọn dẹp tài khoản đã xóa.
import prisma from '../config/prisma.js';
import { COMMENT_STATUS, POST_STATUS, USER_STATUS } from '../constants/status.js';

// Các cột an toàn mặc định; không bao giờ chọn password_hash trừ khi gọi hàm chuyên biệt.
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
  // Khóa dòng người dùng (FOR UPDATE) để thay đổi trạng thái tài khoản không bị xung đột khi chạy đồng thời.
  async lockAccount(userId, db = prisma) {
    const [user] = await db.$queryRaw`
      SELECT user_id, email, full_name, role, status, deleted_at
      FROM users WHERE user_id = ${Number(userId)} FOR UPDATE
    `;
    return user || null;
  },

  // Cập nhật trạng thái tài khoản (khóa, xóa mềm, khôi phục).
  updateAccountStatus(userId, { status, deletedAt = null }, db = prisma) {
    return db.user.update({
      where: { user_id: Number(userId) },
      data: { status, deleted_at: deletedAt },
      select: { user_id: true, email: true, full_name: true, role: true, status: true, deleted_at: true },
    });
  },

  // Xóa mềm toàn bộ bài viết và bình luận của tài khoản bị xóa, lưu lại trạng thái cũ để có thể khôi phục.
  async softDeleteAccountContent(userId, deletedAt, db = prisma) {
    // Sao chép cột hiện có ngay trong cùng câu UPDATE để không phải đoán hay đọc trạng thái kiểm duyệt đã cũ.
    await db.$executeRaw`UPDATE comments
      SET status_before_account_deletion = status, status = ${COMMENT_STATUS.DELETED}, deleted_at = ${deletedAt}
      WHERE user_id = ${Number(userId)} AND status <> ${COMMENT_STATUS.DELETED}`;
    await db.$executeRaw`UPDATE posts
      SET status_before_account_deletion = status, status = ${POST_STATUS.DELETED}, deleted_at = ${deletedAt}
      WHERE author_id = ${Number(userId)} AND status <> ${POST_STATUS.DELETED}`;
  },

  // Khôi phục nội dung đã bị xóa cùng tài khoản về trạng thái trước đó.
  async restoreAccountContent(userId, deletedAt, db = prisma) {
    // Chỉ khôi phục nội dung bị xóa đúng lúc xóa tài khoản (deleted_at khớp); nội dung người dùng tự xóa trước đó vẫn giữ nguyên.
    const restoredComments = await db.$executeRaw`UPDATE comments
      SET status = status_before_account_deletion, status_before_account_deletion = NULL, deleted_at = NULL
      WHERE user_id = ${Number(userId)} AND status = ${COMMENT_STATUS.DELETED} AND deleted_at = ${deletedAt}
        AND status_before_account_deletion IS NOT NULL AND status_before_account_deletion <> ${COMMENT_STATUS.DELETED}`;
    const restoredPosts = await db.$executeRaw`UPDATE posts
      SET status = status_before_account_deletion, status_before_account_deletion = NULL, deleted_at = NULL
      WHERE author_id = ${Number(userId)} AND status = ${POST_STATUS.DELETED} AND deleted_at = ${deletedAt}
        AND status_before_account_deletion IS NOT NULL AND status_before_account_deletion <> ${POST_STATUS.DELETED}`;
    // Đếm nội dung không khôi phục được (thiếu trạng thái cũ) để báo cáo cho admin.
    const skippedComments = await db.comment.count({
      where: { user_id: Number(userId), status: COMMENT_STATUS.DELETED, deleted_at: deletedAt },
    });
    const skippedPosts = await db.post.count({
      where: { author_id: Number(userId), status: POST_STATUS.DELETED, deleted_at: deletedAt },
    });
    return { restoredPosts, restoredComments, skippedPosts, skippedComments };
  },

  // Lấy danh tính phục vụ xác thực JWT (kèm tokenVersion để vô hiệu hóa token cũ).
  findAuthIdentityById(userId, db = prisma) {
    return db.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, email: true, full_name: true, role: true, status: true, deleted_at: true, tokenVersion: true },
    });
  },

  // Tìm người dùng theo email.
  async findByEmail(email, select = DEFAULT_USER_SAFE_SELECT, db = prisma) {
    return db.user.findUnique({
      where: { email },
      select,
    });
  },

  // Tìm người dùng theo email kèm mật khẩu băm (chỉ dùng khi đăng nhập).
  async findByEmailWithPassword(email, db = prisma) {
    return db.user.findUnique({
      where: { email },
      select: {
        ...DEFAULT_USER_SAFE_SELECT,
        password_hash: true,
        tokenVersion: true,
      },
    });
  },

  // Tìm người dùng theo ID.
  async findById(userId, select = DEFAULT_USER_SAFE_SELECT, db = prisma) {
    return db.user.findUnique({
      where: { user_id: Number(userId) },
      select,
    });
  },

  // Tạo người dùng mới.
  async create(data, select = DEFAULT_USER_SAFE_SELECT, db = prisma) {
    return db.user.create({
      data,
      select,
    });
  },

  // Cập nhật người dùng.
  async update(userId, data, select = DEFAULT_USER_SAFE_SELECT, db = prisma) {
    return db.user.update({
      where: { user_id: Number(userId) },
      data,
      select,
    });
  },

  // Tạo hoặc cập nhật hồ sơ sức khỏe.
  async upsertHealthProfile(userId, profile, db = prisma) {
    const numericUserId = Number(userId);
    return db.healthProfile.upsert({
      where: { user_id: numericUserId },
      create: { user_id: numericUserId, ...profile },
      update: profile,
    });
  },

  // Thay toàn bộ danh sách dị ứng của người dùng.
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

  // Tìm chế độ ăn theo ID.
  async findDietTypeById(dietTypeId, db = prisma) {
    return db.dietType.findUnique({
      where: { diet_type_id: Number(dietTypeId) },
    });
  },

  // Đếm số nguyên liệu tồn tại trong danh sách ID (để kiểm tra ID dị ứng hợp lệ).
  async countIngredients(ingredientIds, db = prisma) {
    return db.ingredient.count({
      where: { ingredient_id: { in: ingredientIds.map(Number) } },
    });
  },

  // Đếm người dùng.
  async count(args = {}, db = prisma) {
    return db.user.count(args);
  },

  // Lấy danh sách người dùng; mặc định chỉ chọn cột an toàn để không vô tình lộ mật khẩu băm.
  async findMany(args = {}, db = prisma) {
    const finalArgs = { ...args };
    if (!finalArgs.select && !finalArgs.include) {
      finalArgs.select = DEFAULT_USER_SAFE_SELECT;
    }
    return db.user.findMany(finalArgs);
  },

  // Tìm người dùng theo ID kèm mật khẩu băm (dùng khi đổi mật khẩu).
  async findWithPasswordById(userId, db = prisma) {
    return db.user.findUnique({
      where: { user_id: Number(userId) },
      select: {
        ...DEFAULT_USER_SAFE_SELECT,
        password_hash: true,
      },
    });
  },

  // Đổi mật khẩu có điều kiện: hash cũ phải khớp (chống đổi đồng thời) và tài khoản còn hoạt động; tăng tokenVersion để đăng xuất mọi phiên.
  async updatePassword(userId, { expectedHash, passwordHash }, db = prisma) {
    return db.user.updateMany({
      where: { user_id: Number(userId), password_hash: expectedHash, status: USER_STATUS.ACTIVE, deleted_at: null },
      data: { password_hash: passwordHash, tokenVersion: { increment: 1 } },
    });
  },

  // Thêm một bản ghi lịch sử cân nặng/BMI.
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

  // Lấy lịch sử cân nặng, mới nhất trước.
  async getHealthHistories(userId, db = prisma) {
    return db.healthHistory.findMany({
      where: { user_id: Number(userId) },
      orderBy: [{ recorded_date: 'desc' }, { history_id: 'desc' }],
    });
  },

  // Lấy bản ghi cân nặng mới nhất để tránh ghi trùng.
  findLatestHealthHistory(userId, db = prisma) {
    return db.healthHistory.findFirst({
      where: { user_id: Number(userId) },
      orderBy: { history_id: 'desc' },
      select: { weight: true },
    });
  },

  // Lấy hồ sơ sức khỏe kèm chế độ ăn.
  async findHealthProfile(userId, db = prisma) {
    return db.healthProfile.findUnique({
      where: { user_id: Number(userId) },
      include: { diet_type: true },
    });
  },

  // Tạo hoặc cập nhật mục tiêu trong hồ sơ.
  async upsertProfilePreference(userId, goal, db = prisma) {
    const numericUserId = Number(userId);
    return db.healthProfile.upsert({
      where: { user_id: numericUserId },
      create: { user_id: numericUserId, goal },
      update: { goal },
    });
  },

  // Đếm tài khoản đã xóa mềm.
  async countDeleted(db = prisma) {
    return db.user.count({ where: { status: 'DELETED' } });
  },

  // Đếm tài khoản đã xóa mềm quá hạn lưu giữ.
  async countExpiredDeleted(threshold, db = prisma) {
    return db.user.count({ where: { status: 'DELETED', deleted_at: { lte: threshold } } });
  },

  // Lấy các tài khoản sắp bị xóa vĩnh viễn, xóa sớm nhất trước.
  async findPendingPurgeUsers(limit = 10, db = prisma) {
    return db.user.findMany({
      where: { status: 'DELETED' },
      select: { user_id: true, full_name: true, email: true, deleted_at: true },
      take: limit,
      orderBy: { deleted_at: 'asc' },
    });
  },

  // Lấy ID tài khoản đã xóa mềm quá hạn để xóa vĩnh viễn.
  async findExpiredDeletedUserIds(threshold, db = prisma) {
    return db.user.findMany({
      where: { status: 'DELETED', deleted_at: { lte: threshold } },
      select: { user_id: true },
    });
  },

  // Xóa vĩnh viễn tài khoản theo danh sách ID.
  async deleteUsersByIds(userIds, db = prisma) {
    return db.user.deleteMany({
      where: { user_id: { in: userIds } },
    });
  },
};
