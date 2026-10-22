// D:/SWP391/SWP391/server/src/validators/guestQuotaValidator.js
import { z } from 'zod';
import { ApiError } from '../utils/apiError.js';

export const MAX_GUEST_ID_LENGTH = 100;
export const guestIdSchema = z.string().trim().min(1).max(MAX_GUEST_ID_LENGTH);
const guestQuotaParamsSchema = z.object({ guestId: guestIdSchema }).strict();

export const guestQuotaAdminSchema = z.object({
  guestId: guestIdSchema,
  adminUserId: z.number().int().positive(),
}).strict();

export function parseGuestQuotaInput(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw ApiError.badRequest('Dữ liệu hạn mức AI không hợp lệ', result.error.issues.map((issue) => ({
    field: issue.path.join('.'), message: issue.message,
  })));
}

export const validateGuestQuotaParams = (req, res, next) => {
  try {
    res.locals.guestQuotaParams = parseGuestQuotaInput(guestQuotaParamsSchema, req.params);
    next();
  } catch (error) {
    next(error);
  }
};
