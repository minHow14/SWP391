// d:\Projects\FPT\SWP391\server\src\validators\video.validator.js
import { z } from 'zod';
import { textSchema, idSchema } from './common.validator.js';

export const createVideoSchema = z.object({
  title: textSchema(255),
  video_url: z.string().trim().min(1, 'Đường dẫn video không được để trống').max(500),
  thumbnail_url: z.string().trim().max(500).nullable().optional(),
  duration: z.coerce.number().int().min(0).max(86400).optional(),
  transcript: z.string().max(100000).optional(),
  categoryId: idSchema.nullable().optional(),
  category_id: idSchema.nullable().optional(),
});

export const updateVideoSchema = z
  .object({
    title: textSchema(255).optional(),
    video_url: z.string().trim().min(1).max(500).optional(),
    thumbnail_url: z.string().trim().max(500).nullable().optional(),
    duration: z.coerce.number().int().min(0).max(86400).optional(),
    transcript: z.string().max(100000).optional(),
    categoryId: idSchema.nullable().optional(),
    category_id: idSchema.nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    'Cần ít nhất một trường để cập nhật'
  );
