import { createHash } from 'node:crypto';
import prisma from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';

export const ingredientImageUrl = ingredientId => `/api/workspace/ingredients/${ingredientId}/image`;

export async function sendIngredientImage(req, res) {
  const ingredientId = Number(req.params.id);
  if (!Number.isSafeInteger(ingredientId) || ingredientId <= 0) throw ApiError.badRequest('Mã nguyên liệu không hợp lệ.');
  const [image] = await prisma.$queryRaw`SELECT mime_type, image_data, source_url FROM ingredient_images WHERE ingredient_id = ${ingredientId}`;
  if (!image?.image_data || !['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(image.mime_type)) throw ApiError.notFound('Chưa có ảnh nguyên liệu.');
  const bytes = Buffer.from(image.image_data);
  res.set({
    'Content-Type': image.mime_type,
    'Cache-Control': 'public, max-age=86400',
    ETag: `"${createHash('sha256').update(bytes).digest('hex')}"`,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
  });
  // Express handles If-None-Match and returns 304 for an unchanged image.
  res.send(bytes);
}
