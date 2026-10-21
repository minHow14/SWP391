// d:\Projects\FPT\SWP391\server\src\validators\blog.validator.js
import { z } from 'zod';
import { idSchema, textSchema, updateSchema } from './common.validator.js';

export const createBlogSchema = z.object({
  title: textSchema(255),
  content: textSchema(50000),
  attached_video_id: idSchema.nullable().optional(),
}).strict();

export const updateBlogSchema = updateSchema({
  title: textSchema(255).optional(),
  content: textSchema(50000).optional(),
  attached_video_id: idSchema.nullable().optional(),
});
