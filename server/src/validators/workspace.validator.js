// D:/SWP391/SWP391/server/src/validators/workspace.validator.js
// Schema cho không gian cá nhân: hồ sơ dinh dưỡng, nhật ký ăn uống, thực đơn và quán ăn.
import { z } from 'zod';
import { idSchema, textSchema } from './common.validator.js';

// Ngày YYYY-MM-DD phải là ngày có thật (chặn kiểu 2024-02-30 bị Date tự đẩy sang tháng sau).
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
  'Ngày không hợp lệ (định dạng YYYY-MM-DD)'
);

// Các bữa trong ngày.
export const mealTypeSchema = z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']);

// Hồ sơ dinh dưỡng: chiều cao 50–250 cm, cân nặng 10–400 kg, mục tiêu calo ≤ 10000.
export const workspaceProfileSchema = z.object({
  height: z.number().min(50).max(250),
  weight: z.number().min(10).max(400),
  calorieGoal: z.number().positive().max(10000),
  goal: textSchema(255),
}).strict();

// Mục nhật ký ăn uống: giá trị dinh dưỡng không âm, chặn trên để loại số liệu nhập sai.
export const diaryEntrySchema = z.object({
  date: dateSchema,
  group: mealTypeSchema,
  name: textSchema(255),
  serving: textSchema(100),
  recipe_id: idSchema.optional(),
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(1000),
  carbs: z.number().min(0).max(1000),
  fat: z.number().min(0).max(1000),
  fiber: z.number().min(0).max(1000),
}).strict();

// Đặt món cho một bữa trong thực đơn; recipe_id null nghĩa là bỏ món khỏi bữa đó.
export const mealPlanSchema = z.object({
  date: dateSchema,
  group: mealTypeSchema,
  recipe_id: idSchema.nullable(),
}).strict();

// Ghi thực đơn của một ngày vào nhật ký.
export const planRecordSchema = z.object({
  date: dateSchema,
}).strict();

// Áp dụng thực đơn AI: id kết quả AI (UUID) và ngày áp dụng.
export const applyAiMealPlanSchema = z.object({
  generationId: z.uuid(),
  date: dateSchema,
}).strict();

// Đề xuất quán ăn/cửa hàng nguyên liệu: tọa độ hợp lệ hoặc null.
// Cửa hàng nguyên liệu không gắn chế độ ăn (diet_type_id null), quán ăn thì bắt buộc có chế độ ăn.
export const suggestRestaurantSchema = z.object({
  name: textSchema(255),
  address: textSchema(255),
  city: textSchema(100),
  diet_type_id: idSchema.nullable(),
  isIngredientShop: z.boolean().default(false),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  image_url: z.string().trim().max(500).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  hours: z.string().trim().max(100).optional().nullable(),
  price_range: z.string().trim().max(100).optional().nullable(),
  separate_kitchen: z.boolean().optional().nullable(),
}).strict().refine(
  ({ isIngredientShop, diet_type_id }) => isIngredientShop ? diet_type_id === null : diet_type_id !== null,
  { path: ['diet_type_id'], message: 'Phân loại địa điểm không khớp chế độ ăn đã chọn.' }
);

// Đánh giá quán: 1–5 sao, nội dung ≤ 1000 ký tự.
export const restaurantReviewSchema = z.object({
  stars: z.number().int().min(1).max(5),
  text: textSchema(1000),
}).strict();
