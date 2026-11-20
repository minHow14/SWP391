// d:\Projects\FPT\SWP391\server\src/repositories/aiLogRepository.js
// Repository nhật ký gọi AI: lọc, phân trang và thống kê theo tính năng/mô hình/ngày bằng SQL GROUPING SETS.
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { AI_LOG_FEATURE, AI_LOG_LIMITS } from '../constants/aiLogs.js';
import { getAiLogDateRange } from '../utils/aiLogDate.js';

// Các cột trả về của log AI.
const AI_LOG_SELECT = Object.freeze({
  logId: true, modelName: true, action: true, status: true, errorFeedback: true, createdAt: true,
});
// Mới nhất trước; log thiếu createdAt xếp cuối; thêm logId để thứ tự ổn định.
const AI_LOG_ORDER = [{ createdAt: { sort: 'desc', nulls: 'last' } }, { logId: 'desc' }];

// Tính năng được suy ra từ tiền tố của action (CHAT*, MEAL_PLANNER*); còn lại thuộc nhóm "khác".
function featureFilter(feature) {
  const chatbot = { action: { startsWith: 'CHAT' } };
  const mealPlanner = { action: { startsWith: 'MEAL_PLANNER' } };
  if (feature === AI_LOG_FEATURE.CHATBOT) return chatbot;
  if (feature === AI_LOG_FEATURE.MEAL_PLANNER) return mealPlanner;
  return { NOT: { OR: [chatbot, mealPlanner] } };
}

// Dựng điều kiện where từ bộ lọc của admin (khoảng ngày, trạng thái, mô hình, action, tính năng, từ khóa).
function logWhere(query) {
  const where = {};
  const createdAt = getAiLogDateRange(query);
  if (Object.keys(createdAt).length) where.createdAt = createdAt;
  if (query.status) where.status = query.status;
  if (query.modelName) where.modelName = { contains: query.modelName, mode: 'insensitive' };
  if (query.action) where.action = query.action;
  if (query.feature) Object.assign(where, featureFilter(query.feature));
  if (query.search) where.AND = [{ OR: [
    { action: { contains: query.search, mode: 'insensitive' } },
    { errorFeedback: { contains: query.search, mode: 'insensitive' } },
  ] }];
  return where;
}

// Điều kiện khoảng ngày cho truy vấn SQL thô; dùng Prisma.sql để tham số hóa, chống SQL injection.
function statsDateFilter(query) {
  const range = getAiLogDateRange(query);
  const conditions = [Prisma.sql`TRUE`];
  if (range.gte) conditions.push(Prisma.sql`created_at >= ${range.gte}`);
  if (range.lt) conditions.push(Prisma.sql`created_at < ${range.lt}`);
  return Prisma.join(conditions, ' AND ');
}

export const aiLogRepository = {
  // Tạo log AI.
  create(data, db = prisma) {
    return db.aiLog.create({ data, select: AI_LOG_SELECT });
  },

  // Cập nhật log AI (vd. admin đánh dấu đã xử lý).
  update({ logId, data }, db = prisma) {
    return db.aiLog.update({ where: { logId }, data, select: AI_LOG_SELECT });
  },

  // Đếm log theo bộ lọc.
  count(query = {}, db = prisma) {
    return db.aiLog.count({ where: logWhere(query) });
  },

  // Lấy một trang log theo bộ lọc.
  findPage(query, db = prisma) {
    return db.aiLog.findMany({
      where: logWhere(query), select: AI_LOG_SELECT, orderBy: AI_LOG_ORDER,
      skip: (query.page - 1) * query.limit, take: query.limit,
    });
  },

  // Lấy các log gần nhất.
  findRecent(limit = AI_LOG_LIMITS.MAX_PAGE_SIZE, db = prisma) {
    return db.aiLog.findMany({ select: AI_LOG_SELECT, orderBy: AI_LOG_ORDER, take: limit });
  },

  // Thống kê số log theo trạng thái cho tổng thể và từng chiều trong một truy vấn; ngày tính theo giờ Việt Nam.
  findStats(query, db = prisma) {
    return db.$queryRaw`
      WITH filtered AS (
        SELECT model_name, status,
          CASE WHEN action LIKE 'CHAT%' THEN 'chatbot'
               WHEN strpos(action, 'MEAL_PLANNER') = 1 THEN 'mealPlanner'
               ELSE 'other' END AS feature,
          to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS day
        FROM ai_logs WHERE ${statsDateFilter(query)}
      )
      SELECT CASE WHEN GROUPING(model_name) = 0 THEN 'model'
                  WHEN GROUPING(feature) = 0 THEN 'feature'
                  WHEN GROUPING(day) = 0 THEN 'day'
                  ELSE 'overall' END AS dimension,
             COALESCE(model_name, feature, day) AS "groupKey", status, COUNT(*)::integer AS count
      FROM filtered
      GROUP BY GROUPING SETS ((status), (model_name, status), (feature, status), (day, status))
      ORDER BY dimension, "groupKey", status
    `;
  },
};
