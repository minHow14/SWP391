// d:\Projects\FPT\SWP391\server\src/validators/guestQuotaValidator.js
// Schema và middleware validate cho hạn mức hỏi AI của khách.
import { z } from 'zod';
import { ApiError } from '../utils/apiError.js';

export const MAX_GUEST_ID_LENGTH = 100;
// guestId do client sinh, giới hạn 1–100 ký tự.
export const guestIdSchema = z.string().trim().min(1).max(MAX_GUEST_ID_LENGTH);
const guestQuotaParamsSchema = z.object({ guestId: guestIdSchema }).strict();

// Dữ liệu admin đặt lại hạn mức: kèm adminUserId để ghi nhận người thực hiện.
export const guestQuotaAdminSchema = z.object({
  guestId: guestIdSchema,
  adminUserId: z.number().int().positive(),
}).strict();

// Parse input theo schema, lỗi thì ném ApiError 400 kèm danh sách field sai.
export function parseGuestQuotaInput(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw ApiError.badRequest('Dữ liệu hạn mức AI không hợp lệ', result.error.issues.map((issue) => ({
    field: issue.path.join('.'), message: issue.message,
  })));
}

// Middleware validate :guestId, kết quả lưu ở res.locals.guestQuotaParams.
export const validateGuestQuotaParams = (req, res, next) => {
  try {
    res.locals.guestQuotaParams = parseGuestQuotaInput(guestQuotaParamsSchema, req.params);
    next();
  } catch (error) {
    next(error);
  }
};
