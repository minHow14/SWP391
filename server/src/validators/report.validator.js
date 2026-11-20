// d:\Projects\FPT\SWP391\server\src\validators\report.validator.js
// Schema cho báo cáo vi phạm.
import { z } from 'zod';
import { idSchema, textSchema } from './common.validator.js';

// Báo cáo vi phạm: lý do 5–1000 ký tự; nhận cả camelCase lẫn snake_case rồi chuẩn hóa về camelCase;
// bắt buộc chỉ định bài viết hoặc bình luận bị báo cáo.
export const createReportSchema = z
  .object({
    post_id: idSchema.optional(),
    postId: idSchema.optional(),
    comment_id: idSchema.optional(),
    commentId: idSchema.optional(),
    reason: textSchema(1000).refine((val) => val.length >= 5, {
      message: 'Lý do báo cáo phải có ít nhất 5 ký tự',
    }),
  })
  .transform((data) => ({
    postId: data.postId ?? data.post_id,
    commentId: data.commentId ?? data.comment_id,
    reason: data.reason,
  }))
  .refine((data) => data.postId || data.commentId, {
    message: 'Báo cáo phải chỉ định ít nhất một bài viết hoặc một bình luận',
  });
