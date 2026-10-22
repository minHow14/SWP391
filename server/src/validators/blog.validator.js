// d:\Projects\FPT\SWP391\server\src\validators\blog.validator.js
import { z } from 'zod';
import { idSchema, textSchema } from './common.validator.js';

export const attachmentItemSchema = z.object({
  url: z.string().trim().min(1, 'Đường dẫn tệp không được để trống').max(500),
  type: z.enum(['image', 'video']).default('image'),
  name: z.string().trim().max(255).optional(),
});

export const createBlogSchema = z.object({
  title: textSchema(255),
  content: textSchema(50000),
  categoryId: idSchema.nullable().optional(),
  category_id: idSchema.nullable().optional(),
  attachedVideoId: idSchema.nullable().optional(),
  attached_video_id: idSchema.nullable().optional(),
  attachments: z.array(attachmentItemSchema).max(6, 'Tối đa 6 tệp đính kèm').optional(),
});

export const updateBlogSchema = z
  .object({
    title: textSchema(255).optional(),
    content: textSchema(50000).optional(),
    categoryId: idSchema.nullable().optional(),
    category_id: idSchema.nullable().optional(),
    attachedVideoId: idSchema.nullable().optional(),
    attached_video_id: idSchema.nullable().optional(),
    attachments: z.array(attachmentItemSchema).max(6, 'Tối đa 6 tệp đính kèm').optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    'Cần ít nhất một trường để cập nhật'
  );
