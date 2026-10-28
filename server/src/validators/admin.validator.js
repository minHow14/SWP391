// d:\Projects\FPT\SWP391\server\src\validators\admin.validator.js
import { z } from 'zod';
import { textSchema } from './common.validator.js';

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'BANNED', 'DELETED', 'PENDING']),
}).strict();

export const updatePostStatusSchema = z.object({
  status: z.enum(['PUBLISHED', 'HIDDEN', 'DELETED', 'HIDDEN_BY_AI', 'DRAFT']),
}).strict();

export const updatePostSchema = z.object({
  title: textSchema(255).optional(),
  content: z.string().trim().min(1).optional(),
}).strict().refine(
  (data) => data.title !== undefined || data.content !== undefined,
  { message: 'Cần ít nhất một trường title hoặc content để cập nhật' }
);

export const updateCommentStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'HIDDEN', 'DELETED', 'HIDDEN_BY_AI']),
}).strict();

export const createCategorySchema = z.object({
  name: textSchema(100),
}).strict();

export const updateCategorySchema = z.object({
  name: textSchema(100),
}).strict();

export const resolveAiFlaggedItemSchema = z.object({
  entityType: z.enum(['POST', 'COMMENT', 'post', 'comment']),
  entityId: z.coerce.number().int().positive(),
  action: z.enum(['APPROVE', 'REJECT', 'REMOVE', 'DELETE', 'approve', 'reject', 'remove', 'delete']),
  notes: z.string().trim().max(500).optional(),
}).strict();

export const updateReportStatusSchema = z.object({
  status: z
    .enum([
      'PENDING',
      'RESOLVED',
      'DISMISSED',
      'REJECTED',
      'pending',
      'resolved',
      'dismissed',
      'rejected',
    ])
    .transform((val) => {
      const upper = val.toUpperCase();
      return upper === 'REJECTED' ? 'DISMISSED' : upper;
    }),
  resolutionAction: z.enum(['NONE', 'HIDE_CONTENT', 'none', 'hide_content']).optional(),
}).strict();

export const resetGuestQuotaSchema = z.object({
  guest_id: z.string().trim().min(1).max(100).optional(),
  guestId: z.string().trim().min(1).max(100).optional(),
}).strict().refine(
  (data) => Boolean(data.guest_id || data.guestId),
  { message: 'Mã khách (guestId hoặc guest_id) là bắt buộc' }
);

export const guestIdParamSchema = z.object({
  guestId: z.string().trim().min(1).max(100),
}).strict();

export const retentionStatsQuerySchema = z.object({
  retentionDays: z.coerce.number().int().positive().max(365).optional(),
});
