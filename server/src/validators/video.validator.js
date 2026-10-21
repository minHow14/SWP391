// d:\Projects\FPT\SWP391\server\src\validators\video.validator.js
import { z } from 'zod';
import { textSchema, urlSchema, updateSchema } from './common.validator.js';

export const createVideoSchema = z.object({
  title: textSchema(255),
  video_url: urlSchema,
  thumbnail_url: urlSchema.nullable().optional(),
  duration: z.coerce.number().int().min(0).max(86400).optional(),
  transcript: z.string().max(100000).optional(),
}).strict();

export const updateVideoSchema = updateSchema({
  title: textSchema(255).optional(),
  video_url: urlSchema.optional(),
  thumbnail_url: urlSchema.nullable().optional(),
  duration: z.coerce.number().int().min(0).max(86400).optional(),
  transcript: z.string().max(100000).optional(),
});
