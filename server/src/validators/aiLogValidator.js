// d:\Projects\FPT\SWP391\server\src/validators/aiLogValidator.js
// Schema cho nhật ký AI: bộ lọc truy vấn của admin, dữ liệu ghi log và dữ liệu xử lý lỗi.
import { z } from 'zod';
import { AI_LOG_FEATURE, AI_LOG_LIMITS, AI_LOG_STATUS } from '../constants/aiLogs.js';
import { ApiError } from '../utils/apiError.js';

const dateSchema = z.iso.date();
const optionalText = (max) => z.string().trim().max(max).optional();
const dateRangeShape = { dateFrom: dateSchema.optional(), dateTo: dateSchema.optional() };
// Khoảng ngày hợp lệ khi thiếu một đầu hoặc dateFrom ≤ dateTo (so sánh chuỗi YYYY-MM-DD là đủ).
const validDateRange = ({ dateFrom, dateTo }) => !dateFrom || !dateTo || dateFrom <= dateTo;
const dateRangeError = { path: ['dateTo'], message: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.' };

// Bộ lọc danh sách nhật ký AI, giới hạn độ dài text và kích thước trang theo AI_LOG_LIMITS.
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

// Bộ lọc thống kê: chỉ khoảng ngày.
export const aiLogStatsQuerySchema = z.object(dateRangeShape).strict().refine(validDateRange, dateRangeError);

// Dữ liệu một bản ghi nhật ký AI khi hệ thống ghi log.
export const aiLogRecordSchema = z.object({
  modelName: z.string().trim().min(1).max(AI_LOG_LIMITS.TEXT),
  action: z.string().trim().min(1).max(AI_LOG_LIMITS.TEXT),
  status: z.enum(Object.values(AI_LOG_STATUS)),
  errorFeedback: z.string().max(AI_LOG_LIMITS.MAX_ERROR_LENGTH).nullable().optional(),
}).strict();

// Dữ liệu admin ghi chú/xử lý một log lỗi.
export const aiLogResolutionSchema = z.object({
  logId: z.number().int().positive(),
  errorFeedback: z.string().trim().min(1).max(AI_LOG_LIMITS.MAX_ERROR_LENGTH),
}).strict();

// Parse input theo schema, lỗi thì ném ApiError 400 kèm danh sách field sai.
export function parseAiLogInput(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw ApiError.badRequest('Dữ liệu nhật ký AI không hợp lệ', result.error.issues.map((issue) => ({
    field: issue.path.join('.'), message: issue.message,
  })));
}

// Middleware validate query nhật ký AI, kết quả lưu ở res.locals.aiLogQuery.
export const validateAiLogQuery = (schema) => (req, res, next) => {
  try {
    // Express 5 cung cấp req.query qua getter; giữ dữ liệu đã kiểm tra trong res.locals.
    res.locals.aiLogQuery = parseAiLogInput(schema, req.query);
    next();
  } catch (error) {
    next(error);
  }
};
