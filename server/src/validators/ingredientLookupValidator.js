// D:/SWP391/SWP391/server/src/validators/ingredientLookupValidator.js
import { z } from 'zod';
import { MAX_FOOD_SCAN_BASE64_LENGTH, MAX_FOOD_SCAN_IMAGE_BYTES } from '../constants/foodScanner.js';

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
export const generatedIngredientSchema = z.object({
  category: z.enum(['protein', 'mushroom', 'vegetable', 'additive', 'other']),
  origin: text(500), plant: z.boolean().nullable(), description: text(2_000), cooking: text(2_000),
  aliases: z.string().trim().max(1_000),
}).strict();
export const ingredientLookupResultSchema = z.discriminatedUnion('isIngredient', [
  z.object({ isIngredient: z.literal(true), ingredient: generatedIngredientSchema }).strict(),
  z.object({ isIngredient: z.literal(false), ingredient: z.null() }).strict(),
]);
