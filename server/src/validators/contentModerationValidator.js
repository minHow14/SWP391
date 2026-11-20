// D:/SWP391/SWP391/server/src/validators/contentModerationValidator.js
// Schema cho kiểm duyệt nội dung bằng AI: tham số API và kiểm tra tính nhất quán của kết quả AI.
import { z } from 'zod';

// Tham số jobId phải là UUID.
export const contentModerationJobParamsSchema = z.object({ jobId: z.uuid() }).strict();
// Phân trang danh sách job, tối đa 100/trang.
export const contentModerationPageSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
}).strict();
// Kết quả kiểm duyệt văn bản: REVIEW bắt buộc có phân loại và bằng chứng;
// ALLOW thì không được có phân loại/bằng chứng — loại bỏ kết quả AI tự mâu thuẫn.
export const contentModerationResultSchema = z.object({
  decision: z.enum(['ALLOW', 'REVIEW']),
  reason: z.string().trim().min(1).max(2_000),
  categories: z.array(z.string().trim().min(1).max(64)).max(10),
  evidence: z.array(z.string().min(1).max(1_000)).max(5),
  modelName: z.string().trim().min(1).max(100),
  policyVersion: z.string().trim().min(1).max(100),
}).strict().refine((result) => result.decision !== 'REVIEW' || (result.categories.length > 0 && result.evidence.length > 0),
  'Kết quả cần xem xét phải có phân loại và bằng chứng.')
  .refine((result) => result.decision !== 'ALLOW' || (result.categories.length === 0 && result.evidence.length === 0),
    'Kết quả cho phép không được chứa phân loại hoặc bằng chứng vi phạm.');

// Kết luận cho ảnh mô tả những gì nhìn thấy thay vì trích dẫn văn bản, nên dùng observations thay cho evidence.
export const imageModerationResultSchema = z.object({
  decision: z.enum(['ALLOW', 'REVIEW']),
  reason: z.string().trim().min(1).max(2_000),
  categories: z.array(z.string().trim().min(1).max(64)).max(10),
  observations: z.array(z.string().trim().min(1).max(500)).max(5),
  modelName: z.string().trim().min(1).max(100),
  policyVersion: z.string().trim().min(1).max(100),
}).strict().refine((result) => result.decision !== 'REVIEW' || (result.categories.length > 0 && result.observations.length > 0),
  'Ảnh cần xem xét phải có phân loại và mô tả.')
  .refine((result) => result.decision !== 'ALLOW' || result.categories.length === 0,
    'Ảnh được cho phép không được chứa phân loại vi phạm.');

// Kiểm tra kết quả kiểm duyệt ảnh, ném lỗi nếu không hợp lệ.
export function validateImageModerationResult(result) {
  return imageModerationResultSchema.parse(result);
}

// Kiểm tra kết quả kiểm duyệt văn bản; mọi bằng chứng phải là trích đoạn có thật trong tiêu đề/nội dung
// để chặn AI bịa bằng chứng (hallucination).
export function validateContentModerationResult(result, job) {
  const parsed = contentModerationResultSchema.parse(result);
  const source = `${job.title || ''}\n${job.content}`;
  if (!parsed.evidence.every((item) => source.includes(item))) throw new Error('Unsupported moderation evidence.');
  return parsed;
}
