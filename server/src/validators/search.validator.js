// d:\Projects\FPT\SWP391\server\src\validators\search.validator.js
import { z } from 'zod';
import { textSchema } from './common.validator.js';

export const searchSchema = z.object({
  q: textSchema(200),
  type: z.enum(['ALL', 'BLOG', 'VIDEO']).default('ALL').optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  categoryId: z.coerce.number().int().min(1).optional(),
  category_id: z.coerce.number().int().min(1).optional(),
});

export const recommendationSchema = z.object({
  keyword: textSchema(200),
}).strict();
