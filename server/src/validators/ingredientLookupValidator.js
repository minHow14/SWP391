// D:/SWP391/SWP391/server/src/validators/ingredientLookupValidator.js
import { z } from 'zod';
import { MAX_FOOD_SCAN_BASE64_LENGTH, MAX_FOOD_SCAN_IMAGE_BYTES } from '../constants/foodScanner.js';
import {
  NUTRITION_ATWATER, NUTRITION_ENERGY_TOLERANCE, NUTRITION_MAX_CALORIES_PER_100G, NUTRITION_MAX_GRAMS_PER_100G,
} from '../constants/ingredientLookup.js';

export const normalizeIngredientName = (name) => name.normalize('NFKC').trim().replace(/\s+/gu, ' ');
const text = (limit) => z.string().trim().min(1).max(limit);

function isPhotoConsistent({ imageBase64, mimeType }) {
  const bytes = Buffer.from(imageBase64, 'base64');
  if (bytes.length > MAX_FOOD_SCAN_IMAGE_BYTES) return false;
  if (mimeType === 'image/jpeg') return bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimeType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}

const photoSchema = z.object({
  imageBase64: text(MAX_FOOD_SCAN_BASE64_LENGTH).refine(
    (value) => value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value), 'Dữ liệu ảnh không hợp lệ.'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
}).strict().refine(isPhotoConsistent, 'Ảnh không đúng định dạng hoặc vượt quá 10 MB.');

export const ingredientLookupSchema = z.object({
  ingredientName: text(150).transform(normalizeIngredientName).pipe(text(150)),
  photo: photoSchema.optional(),
}).strict();
export const ingredientLookupParamsSchema = z.object({ id: z.uuid() }).strict();
const grams = z.number().finite().min(0).max(NUTRITION_MAX_GRAMS_PER_100G);

export function isEnergyConsistent({ calories, protein, fat, carbs }) {
  const estimated = protein * NUTRITION_ATWATER.protein + carbs * NUTRITION_ATWATER.carbs + fat * NUTRITION_ATWATER.fat;
  const allowed = Math.max(NUTRITION_ENERGY_TOLERANCE.kcal, NUTRITION_ENERGY_TOLERANCE.ratio * Math.max(calories, estimated));
  return Math.abs(calories - estimated) <= allowed;
}

export const nutritionPer100gSchema = z.object({
  calories: z.number().finite().min(0).max(NUTRITION_MAX_CALORIES_PER_100G),
  protein: grams, fat: grams, carbs: grams,
}).strict()
  .refine(({ protein, fat, carbs }) => protein + fat + carbs <= NUTRITION_MAX_GRAMS_PER_100G,
    'Tổng protein, chất béo và carbohydrate không thể vượt 100 g trên 100 g.')
  .refine(isEnergyConsistent, 'Năng lượng không khớp với protein, chất béo và carbohydrate.');

export const generatedIngredientSchema = z.object({
  category: z.enum(['protein', 'mushroom', 'vegetable', 'additive', 'other']),
  origin: text(500), plant: z.boolean().nullable(), description: text(2_000), cooking: text(2_000),
  aliases: z.string().trim().max(1_000),
  // Null when the provider cannot give a typical value; absent from older AI versions.
  nutritionPer100g: nutritionPer100gSchema.nullable().default(null),
}).strict();
export const ingredientLookupResultSchema = z.discriminatedUnion('isIngredient', [
  z.object({ isIngredient: z.literal(true), ingredient: generatedIngredientSchema }).strict(),
  z.object({ isIngredient: z.literal(false), ingredient: z.null() }).strict(),
]);
