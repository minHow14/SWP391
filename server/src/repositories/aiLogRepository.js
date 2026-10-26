// d:\Projects\FPT\SWP391\server\src/repositories/aiLogRepository.js
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { AI_LOG_FEATURE, AI_LOG_LIMITS } from '../constants/aiLogs.js';
import { getAiLogDateRange } from '../utils/aiLogDate.js';

const AI_LOG_SELECT = Object.freeze({
  logId: true, modelName: true, action: true, status: true, errorFeedback: true, createdAt: true,
});
const AI_LOG_ORDER = [{ createdAt: { sort: 'desc', nulls: 'last' } }, { logId: 'desc' }];

function featureFilter(feature) {
  const chatbot = { action: { startsWith: 'CHAT' } };
  const mealPlanner = { action: { startsWith: 'MEAL_PLANNER' } };
  if (feature === AI_LOG_FEATURE.CHATBOT) return chatbot;
  if (feature === AI_LOG_FEATURE.MEAL_PLANNER) return mealPlanner;
  return { NOT: { OR: [chatbot, mealPlanner] } };
}

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

function statsDateFilter(query) {
  const range = getAiLogDateRange(query);
  const conditions = [Prisma.sql`TRUE`];
  if (range.gte) conditions.push(Prisma.sql`created_at >= ${range.gte}`);
  if (range.lt) conditions.push(Prisma.sql`created_at < ${range.lt}`);
  return Prisma.join(conditions, ' AND ');
}

export const aiLogRepository = {
  create(data, db = prisma) {
    return db.aiLog.create({ data, select: AI_LOG_SELECT });
  },

  update({ logId, data }, db = prisma) {
    return db.aiLog.update({ where: { logId }, data, select: AI_LOG_SELECT });
  },

  count(query = {}, db = prisma) {
    return db.aiLog.count({ where: logWhere(query) });
  },

  findPage(query, db = prisma) {
    return db.aiLog.findMany({
      where: logWhere(query), select: AI_LOG_SELECT, orderBy: AI_LOG_ORDER,
      skip: (query.page - 1) * query.limit, take: query.limit,
    });
  },

  findRecent(limit = AI_LOG_LIMITS.MAX_PAGE_SIZE, db = prisma) {
    return db.aiLog.findMany({ select: AI_LOG_SELECT, orderBy: AI_LOG_ORDER, take: limit });
  },

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
