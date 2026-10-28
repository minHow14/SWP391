// D:/SWP391/SWP391/server/src/validators/contentModerationValidator.js
import { z } from 'zod';

export const contentModerationJobParamsSchema = z.object({ jobId: z.uuid() }).strict();
export const contentModerationResultSchema = z.object({
  decision: z.enum(['ALLOW', 'REVIEW']),
  reason: z.string().trim().min(1).max(2_000),
  categories: z.array(z.string().trim().min(1).max(64)).max(10),
  evidence: z.array(z.string().min(1).max(1_000)).max(5),
  modelName: z.string().trim().min(1).max(100),
  policyVersion: z.string().trim().min(1).max(100),
}).strict().refine((result) => result.decision !== 'REVIEW' || (result.categories.length > 0 && result.evidence.length > 0),
  'Kết quả cần xem xét phải có phân loại và bằng chứng.');

export function validateContentModerationResult(result, job) {
  const parsed = contentModerationResultSchema.parse(result);
  const source = `${job.title || ''}\n${job.content}`;
  if (!parsed.evidence.every((item) => source.includes(item))) throw new Error('Unsupported moderation evidence.');
  return parsed;
}
