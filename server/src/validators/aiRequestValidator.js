// D:/SWP391/SWP391/server/src/validators/aiRequestValidator.js
import { z } from 'zod';
import { ApiError } from '../utils/apiError.js';

const MAX_MESSAGE_LENGTH = 5000;
const MAX_MENU_CONTEXT_LENGTH = 8000;
const MAX_HISTORY_LENGTH = 10;
const MAX_INGREDIENTS = 100;
const MAX_INGREDIENT_LENGTH = 100;
const ingredientList = z.array(z.string().trim().min(1).max(MAX_INGREDIENT_LENGTH)).max(MAX_INGREDIENTS).optional();
const dietaryType = z.enum(['vegan', 'lacto', 'ovo', 'lacto_ovo']).optional();

export const aiChatSchema = z.object({
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(MAX_MENU_CONTEXT_LENGTH) }))
    .max(MAX_HISTORY_LENGTH).default([]),
  dietaryType,
  menuContext: z.string().max(MAX_MENU_CONTEXT_LENGTH).optional(),
}).strict();

export const aiMealPlanSchema = z.object({
  heightCm: z.number().gt(50).lt(260), weightKg: z.number().gt(20).lt(300),
  bmi: z.number().gt(8).lt(100).optional(), age: z.number().int().min(10).max(120).optional(),
  gender: z.enum(['male', 'female', 'other', 'unspecified']).optional(),
  goal: z.enum(['weight_loss', 'muscle_gain', 'maintenance']).optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  dietaryType, allergies: ingredientList, availableIngredients: ingredientList,
  days: z.number().int().min(1).max(7).optional(),
}).strict();

export const validateAiBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (result.success) { req.body = result.data; return next(); }
  const details = result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
  const error = new ApiError(422, 'Dữ liệu gửi tới AI không hợp lệ.', details);
  error.errorCode = 'INVALID_INPUT';
  next(error);
};
