// d:\Projects\FPT\SWP391\server\src\validators\comment.validator.js
import { z } from 'zod';
import { idSchema, textSchema, updateSchema } from './common.validator.js';

export const createCommentSchema = z.object({
  post_id: idSchema,
  content: textSchema(5000),
}).strict();

export const updateCommentSchema = updateSchema({
  content: textSchema(5000),
});
