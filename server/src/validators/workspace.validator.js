// d:\Projects\FPT\SWP391\server\src\validators\workspace.validator.js
import { z } from 'zod';
import { idSchema, textSchema } from './common.validator.js';

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
  'Ngày không hợp lệ (định dạng YYYY-MM-DD)'
);

export const mealTypeSchema = z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']);

export const workspaceProfileSchema = z.object({
  height: z.number().min(50).max(250),
  weight: z.number().min(10).max(400),
  calorieGoal: z.number().positive().max(10000),
  goal: textSchema(255),
}).strict();

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

export const mealPlanSchema = z.object({
  date: dateSchema,
  group: mealTypeSchema,
  recipe_id: idSchema.nullable(),
}).strict();

export const planRecordSchema = z.object({
  date: dateSchema,
}).strict();

export const applyAiMealPlanSchema = z.object({
  generationId: z.uuid(),
  date: dateSchema,
}).strict();

export const suggestRestaurantSchema = z.object({
  name: textSchema(255),
  address: textSchema(255),
  city: textSchema(100),
  diet_type_id: idSchema,
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  image_url: z.string().trim().max(500).optional().nullable(),
}).strict();

export const restaurantReviewSchema = z.object({
  stars: z.number().int().min(1).max(5),
  text: textSchema(1000),
}).strict();
