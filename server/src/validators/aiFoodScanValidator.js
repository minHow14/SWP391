// D:/SWP391/SWP391/server/src/validators/aiFoodScanValidator.js
import { z } from 'zod';
import { MAX_FOOD_SCAN_BASE64_LENGTH, MAX_FOOD_SCAN_IMAGE_BYTES } from '../constants/foodScanner.js';

const MAX_DISH_NAME_LENGTH = 150;
const MAX_ALLERGIES_COUNT = 50;
const MAX_ALLERGY_LENGTH = 100;

export const foodScanSchema = z.object({
  imageBase64: z.string().trim().min(1, 'Dữ liệu ảnh không được để trống')
    .max(MAX_FOOD_SCAN_BASE64_LENGTH, 'Ảnh không được vượt quá 10 MB.')
    .refine((value) => value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value), 'Dữ liệu ảnh base64 không hợp lệ.')
    .refine((value) => Buffer.byteLength(value, 'base64') <= MAX_FOOD_SCAN_IMAGE_BYTES, 'Ảnh không được vượt quá 10 MB.'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
  dietTypeId: z.coerce.number().int().positive('Chế độ ăn chay không hợp lệ (dietTypeId phải là số dương).'),
  scanType: z.enum(['AUTO', 'LABEL', 'DISH']).default('AUTO'),
  dishName: z.string().trim().max(MAX_DISH_NAME_LENGTH, 'Tên món không được quá 150 ký tự.').optional().default(''),
  allergies: z.array(z.string().trim().min(1).max(MAX_ALLERGY_LENGTH)).max(MAX_ALLERGIES_COUNT).optional().default([]),
}).strict();

const scanText = z.string().trim().min(1);
export const foodScanResultSchema = z.object({
  dishName: scanText,
  detectedScanType: z.enum(['LABEL', 'DISH']),
  status: z.enum(['clear', 'warning', 'inconclusive']),
  summary: scanText,
  findings: z.array(z.object({ ingredient: scanText, reason: scanText, layer: z.number().int().min(1).max(5),
    severity: z.enum(['violation', 'warning', 'info']) }).strict()),
  identifiedIngredients: z.array(scanText),
  restaurantChecklist: z.array(scanText),
  swapSuggestions: z.array(scanText),
  nutritionEstimate: z.object({ calories: z.number().finite().nonnegative(), protein: z.number().finite().nonnegative(),
    carbs: z.number().finite().nonnegative(), fat: z.number().finite().nonnegative() }).strict().nullable().optional(),
}).strict().refine((result) => result.status !== 'clear' || !result.findings.some((finding) => finding.severity === 'violation'),
  'Kết quả phù hợp không được chứa thành phần vi phạm.');
