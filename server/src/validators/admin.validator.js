// D:/SWP391/SWP391/server/src/validators/admin.validator.js
import { z } from 'zod';
import { textSchema } from './common.validator.js';
import { REPORT_STATUS, USER_STATUS } from '../constants/status.js';

export const updateUserStatusSchema = z.object({
  status: z.enum(Object.values(USER_STATUS)),
}).strict();

export const updatePostStatusSchema = z.object({
  status: z.enum(['PUBLISHED', 'HIDDEN', 'DELETED', 'HIDDEN_BY_AI', 'PENDING_MODERATION', 'DRAFT']),
}).strict();

export const updatePostSchema = z.object({
  title: textSchema(255).optional(),
  content: z.string().trim().min(1).optional(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  category_id: z.coerce.number().int().positive().nullable().optional(),
  video_url: z.string().trim().max(500).optional(),
  videoUrl: z.string().trim().max(500).optional(),
  thumbnail_url: z.string().trim().max(500).nullable().optional(),
  thumbnailUrl: z.string().trim().max(500).nullable().optional(),
  transcript: z.string().trim().optional(),
  attachments: z.array(z.any()).optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Cần ít nhất một trường để cập nhật' }
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
  contentVersion: z.coerce.number().int().min(0).optional(),
}).strict();

export const updateReportStatusSchema = z.object({
  status: z.enum(Object.values(REPORT_STATUS)),
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
