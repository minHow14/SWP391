// D:/SWP391/SWP391/server/src/validators/aiLogValidator.js
import { z } from 'zod';
import { AI_LOG_FEATURE, AI_LOG_LIMITS, AI_LOG_STATUS } from '../constants/aiLogs.js';
import { ApiError } from '../utils/apiError.js';

const dateSchema = z.iso.date();
const optionalText = (max) => z.string().trim().max(max).optional();
const dateRangeShape = { dateFrom: dateSchema.optional(), dateTo: dateSchema.optional() };
const validDateRange = ({ dateFrom, dateTo }) => !dateFrom || !dateTo || dateFrom <= dateTo;
const dateRangeError = { path: ['dateTo'], message: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.' };

export const aiLogQuerySchema = z.object({
  ...dateRangeShape,
  status: z.enum(Object.values(AI_LOG_STATUS)).optional(),
  feature: z.enum(Object.values(AI_LOG_FEATURE)).optional(),
  modelName: optionalText(AI_LOG_LIMITS.TEXT),
  action: optionalText(AI_LOG_LIMITS.TEXT),
  search: optionalText(AI_LOG_LIMITS.SEARCH),
  page: z.coerce.number().int().min(1).max(AI_LOG_LIMITS.MAX_PAGE).default(1),
  limit: z.coerce.number().int().min(1).max(AI_LOG_LIMITS.MAX_PAGE_SIZE).default(AI_LOG_LIMITS.DEFAULT_PAGE_SIZE),
}).strict().refine(validDateRange, dateRangeError);

export const aiLogStatsQuerySchema = z.object(dateRangeShape).strict().refine(validDateRange, dateRangeError);

export const aiLogRecordSchema = z.object({
  modelName: z.string().trim().min(1).max(AI_LOG_LIMITS.TEXT),
  action: z.string().trim().min(1).max(AI_LOG_LIMITS.TEXT),
  status: z.enum(Object.values(AI_LOG_STATUS)),
  errorFeedback: z.string().max(AI_LOG_LIMITS.MAX_ERROR_LENGTH).nullable().optional(),
}).strict();

export const aiLogResolutionSchema = z.object({
  logId: z.number().int().positive(),
  errorFeedback: z.string().trim().min(1).max(AI_LOG_LIMITS.MAX_ERROR_LENGTH),
}).strict();

export function parseAiLogInput(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw ApiError.badRequest('Dữ liệu nhật ký AI không hợp lệ', result.error.issues.map((issue) => ({
    field: issue.path.join('.'), message: issue.message,
  })));
}

export const validateAiLogQuery = (schema) => (req, res, next) => {
  try {
    // Express 5 cung cấp req.query qua getter; giữ dữ liệu đã kiểm tra trong res.locals.
    res.locals.aiLogQuery = parseAiLogInput(schema, req.query);
    next();
  } catch (error) {
    next(error);
  }
};
