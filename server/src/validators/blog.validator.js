// d:\Projects\FPT\SWP391\server\src\validators\blog.validator.js
// Schema cho blog: tạo/sửa bài viết và tệp đính kèm.
import { z } from 'zod';
import { idSchema, textSchema } from './common.validator.js';
import { POST_MEDIA_URL_MESSAGE, POST_MEDIA_URL_PATTERN } from '../constants/postMedia.js';

// Tệp đính kèm: URL phải khớp mẫu đường dẫn media nội bộ (chặn link ngoài tùy ý);
// type được chuẩn hóa về chữ thường, mặc định là ảnh.
export const attachmentItemSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Đường dẫn tệp không được để trống')
    .max(500)
    .regex(POST_MEDIA_URL_PATTERN, POST_MEDIA_URL_MESSAGE),
  type: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
      z.enum(['image', 'video'])
    )
    .default('image'),
  name: z.string().trim().max(255).optional(),
});

// Tạo blog: tiêu đề ≤ 255, nội dung ≤ 50000 ký tự, tối đa 6 tệp đính kèm.
export const createBlogSchema = z.object({
  title: textSchema(255),
  content: textSchema(50000),
  categoryId: idSchema.nullable().optional(),
  category_id: idSchema.nullable().optional(),
  attachedVideoId: idSchema.nullable().optional(),
  attached_video_id: idSchema.nullable().optional(),
  attachments: z.array(attachmentItemSchema).max(6, 'Tối đa 6 tệp đính kèm').optional(),
});

// Sửa blog: field tùy chọn nhưng phải có ít nhất một field.
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
