// d:/Projects/FPT/SWP391/server/src/validators/ingredientRecognition.validator.js
// Schema cho nhận diện nguyên liệu từ ảnh.
import { z } from 'zod';

// Tùy chọn nhận diện: chế độ ăn, thời gian chế biến tối đa 360 phút, ngưỡng tin cậy 0.1–1 (mặc định 0.5).
export const recognizeOptionsSchema = z.object({
  dietTypeId: z.coerce.number().int().positive().optional(),
  maxPrepTime: z.coerce.number().int().positive().max(360).optional(),
  minConfidence: z.coerce.number().min(0.1).max(1.0).default(0.5).optional(),
}).strict();

// Tham số id của lần quét phải là UUID.
export const scanIdParamsSchema = z.object({
  id: z.string().uuid('Mã nhận diện không hợp lệ. Vui lòng cung cấp UUID hợp lệ.'),
}).strict();

// Phân trang lịch sử quét, tối đa 100/trang.
export const listScansQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
}).strict();
