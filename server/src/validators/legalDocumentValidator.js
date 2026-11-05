// D:/SWP391/SWP391/server/src/validators/legalDocumentValidator.js
import { z } from 'zod';

export const legalDocumentParams = z.object({ slug: z.enum(['terms-of-service', 'privacy-policy']) });
export const legalDocumentBody = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(100000),
  published: z.boolean().default(false),
}).strict();
