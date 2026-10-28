// server/src/validators/aiFoodScanValidator.js
import { z } from 'zod';

const MAX_IMAGE_BASE64_LENGTH = 15 * 1024 * 1024; // ~15MB base64 text
const MAX_DISH_NAME_LENGTH = 150;
const MAX_ALLERGIES_COUNT = 50;
const MAX_ALLERGY_LENGTH = 100;

export const foodScanSchema = z.object({
  imageBase64: z.string().trim().min(1, 'Dữ liệu ảnh không được để trống').max(MAX_IMAGE_BASE64_LENGTH, 'Ảnh vượt quá kích thước cho phép.'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
  dietTypeId: z.coerce.number().int().positive('Chế độ ăn chay không hợp lệ (dietTypeId phải là số dương).'),
  scanType: z.enum(['AUTO', 'LABEL', 'DISH']).default('AUTO'),
  dishName: z.string().trim().max(MAX_DISH_NAME_LENGTH, 'Tên món không được quá 150 ký tự.').optional().default(''),
  allergies: z.array(z.string().trim().min(1).max(MAX_ALLERGY_LENGTH)).max(MAX_ALLERGIES_COUNT).optional().default([]),
}).strict();
