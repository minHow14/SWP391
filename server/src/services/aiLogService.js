// d:\Projects\FPT\SWP391\server\src/services/aiLogService.js
import { AI_LOG_STATUS } from '../constants/aiLogs.js';
import { aiLogRepository } from '../repositories/aiLogRepository.js';
import {
  aiLogQuerySchema, aiLogRecordSchema, aiLogResolutionSchema, aiLogStatsQuerySchema, parseAiLogInput,
} from '../validators/aiLogValidator.js';

const PERCENTAGE_SCALE = 100;
const SUCCESS_RATE_DECIMALS = 1;

function countStatuses(rows) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const count = (status) => rows.filter((row) => row.status === status).reduce((sum, row) => sum + row.count, 0);
  const success = count(AI_LOG_STATUS.SUCCESS);
  return {
    total, success, error: count(AI_LOG_STATUS.ERROR), resolved: count(AI_LOG_STATUS.RESOLVED_BY_ADMIN),
    successRate: total ? Number((success * PERCENTAGE_SCALE / total).toFixed(SUCCESS_RATE_DECIMALS)) : null,
  };
}

function groupStatuses(rows, dimension, keyName) {
  const groups = new Map();
  for (const row of rows.filter((item) => item.dimension === dimension && item.groupKey !== null)) {
    const group = groups.get(row.groupKey) ?? [];
    group.push(row);
    groups.set(row.groupKey, group);
  }
  return [...groups].sort(([left], [right]) => left.localeCompare(right))
    .map(([key, group]) => ({ [keyName]: key, ...countStatuses(group) }));
}

export const aiLogService = {
  recordLog(input, db) {
    return aiLogRepository.create(parseAiLogInput(aiLogRecordSchema, input), db);
  },

  resolveLog(input, db) {
    const { logId, errorFeedback } = parseAiLogInput(aiLogResolutionSchema, input);
    return aiLogRepository.update({ logId, data: { errorFeedback, status: AI_LOG_STATUS.RESOLVED_BY_ADMIN } }, db);
  },

  async listLogs(input = {}) {
    const query = parseAiLogInput(aiLogQuerySchema, input);
    const [total, items] = await Promise.all([aiLogRepository.count(query), aiLogRepository.findPage(query)]);
    return { items, page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) };
  },

  async getStats(input = {}) {
    const query = parseAiLogInput(aiLogStatsQuerySchema, input);
    const rows = await aiLogRepository.findStats(query);
    return {
      ...countStatuses(rows.filter((row) => row.dimension === 'overall')),
      dateFrom: query.dateFrom ?? null, dateTo: query.dateTo ?? null,
      byFeature: groupStatuses(rows, 'feature', 'feature'),
      byModel: groupStatuses(rows, 'model', 'modelName'),
      byDay: groupStatuses(rows, 'day', 'date'),
    };
  },
};
