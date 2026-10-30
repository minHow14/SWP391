// D:/SWP391/SWP391/client/src/services/ingredientLookupService.js
import { z } from 'zod';
import apiClient from './apiClient.js';

const LOOKUP_PATH = '/v1/ingredient-lookup-jobs';
const ingredientSchema = z.object({
  id: z.string().min(1), name: z.string().min(1),
  category: z.enum(['protein', 'mushroom', 'vegetable', 'additive', 'other']),
  plant: z.boolean().nullable(), origin: z.string().min(1), description: z.string().min(1),
  cooking: z.string().min(1), aliases: z.string(), image: z.string().nullable(),
});
const receiptSchema = z.object({
  jobId: z.uuid().nullable(), status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
  ingredient: ingredientSchema.nullable(), errorCode: z.string().nullable(), errorMessage: z.string().nullable(),
}).refine((job) => job.status === 'COMPLETED' ? Boolean(job.ingredient) : Boolean(job.jobId));

function unwrap(envelope) {
  const result = receiptSchema.safeParse(envelope?.data);
  if (!envelope?.success || !result.success) throw new Error('Phản hồi tra cứu nguyên liệu không hợp lệ.');
  return result.data;
}

export const ingredientLookupService = {
  async create(payload, signal) {
    return unwrap(await apiClient.post(LOOKUP_PATH, payload, { signal }));
  },
  async get(id, signal) {
    return unwrap(await apiClient.get(`${LOOKUP_PATH}/${encodeURIComponent(id)}`, { signal }));
  },
};
