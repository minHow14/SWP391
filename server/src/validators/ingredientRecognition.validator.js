// d:/Projects/FPT/SWP391/server/src/validators/ingredientRecognition.validator.js
import { z } from 'zod';

export const recognizeOptionsSchema = z.object({
  dietTypeId: z.coerce.number().int().positive().optional(),
  maxPrepTime: z.coerce.number().int().positive().max(360).optional(),
  minConfidence: z.coerce.number().min(0.1).max(1.0).default(0.5).optional(),
}).strict();

export const scanIdParamsSchema = z.object({
  id: z.string().uuid('Mã nhận diện không hợp lệ. Vui lòng cung cấp UUID hợp lệ.'),
}).strict();

export const listScansQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
}).strict();
