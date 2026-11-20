// D:/SWP391/SWP391/server/src/validators/aiGenerationValidator.js
// Schema và middleware validate cho lịch sử kết quả AI đã sinh.
import { z } from 'zod';
import { ApiError } from '../utils/apiError.js';

// Vết prompt đã gửi tới mô hình (tên mô hình, lần thử, danh sách message) để lưu kèm kết quả AI.
export const promptTraceSchema = z.object({
  modelName: z.string().min(1).max(100), attempt: z.number().int().min(1),
  messages: z.array(z.object({ role: z.enum(['system', 'user', 'assistant']), content: z.string() }).strict()).min(1),
}).strict();
// Query danh sách: phân trang (tối đa 100/trang) và lọc theo loại tính năng/trạng thái.
const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['CHAT', 'MEAL_PLAN', 'FOOD_SCAN']).optional(),
  status: z.enum(['PROCESSING', 'COMPLETED', 'FAILED']).optional(),
}).strict();
// Tham số id phải là UUID.
const paramsSchema = z.object({ id: z.uuid() }).strict();

// Middleware: có :id thì validate params, không thì validate query; gắn userId từ token
// vào res.locals.aiGenerationQuery để service chỉ truy vấn dữ liệu của chính người dùng.
export function validateAiGeneration(req, res, next) {
  const parsed = (req.params.id ? paramsSchema : querySchema).safeParse(req.params.id ? req.params : req.query);
  if (!parsed.success) return next(ApiError.badRequest('Dữ liệu truy vấn lịch sử AI không hợp lệ.', parsed.error.issues.map((issue) => ({
    field: issue.path.join('.'), message: issue.message,
  }))));
  res.locals.aiGenerationQuery = { ...parsed.data, userId: req.user.user_id };
  next();
}
