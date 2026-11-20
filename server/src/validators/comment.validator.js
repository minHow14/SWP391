// d:\Projects\FPT\SWP391\server\src\validators\comment.validator.js
// Schema cho bình luận.
import { z } from 'zod';
import { idSchema, textSchema, updateSchema } from './common.validator.js';

// Tạo bình luận: bắt buộc post_id và nội dung ≤ 5000 ký tự.
export const createCommentSchema = z.object({
  post_id: idSchema,
  content: textSchema(5000),
}).strict();

// Sửa bình luận: chỉ cho sửa nội dung.
export const updateCommentSchema = updateSchema({
  content: textSchema(5000),
});
