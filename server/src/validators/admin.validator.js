// D:/SWP391/SWP391/server/src/validators/admin.validator.js
// Schema Zod cho các API quản trị: trạng thái người dùng/bài viết/bình luận, danh mục,
// kiểm duyệt AI, báo cáo vi phạm, hạn mức khách và thống kê lưu trữ.
import { z } from 'zod';
import { textSchema } from './common.validator.js';
import { REPORT_STATUS, USER_STATUS } from '../constants/status.js';

// Chỉ chấp nhận trạng thái người dùng có trong USER_STATUS; .strict() chặn field lạ.
export const updateUserStatusSchema = z.object({
  status: z.enum(Object.values(USER_STATUS)),
}).strict();

// Các trạng thái vòng đời bài viết admin được phép đặt (bao gồm trạng thái do AI ẩn).
export const updatePostStatusSchema = z.object({
  status: z.enum(['PUBLISHED', 'HIDDEN', 'DELETED', 'HIDDEN_BY_AI', 'PENDING_MODERATION', 'DRAFT']),
}).strict();

// Admin sửa bài viết: mọi field đều tùy chọn nhưng phải có ít nhất một field.
// Nhận song song camelCase và snake_case để tương thích client cũ.
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

// Các trạng thái hiển thị bình luận admin được phép đặt.
export const updateCommentStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'HIDDEN', 'DELETED', 'HIDDEN_BY_AI']),
}).strict();

// Tên danh mục bắt buộc, tối đa 100 ký tự.
export const createCategorySchema = z.object({
  name: textSchema(100),
}).strict();

// Đổi tên danh mục, cùng ràng buộc như khi tạo.
export const updateCategorySchema = z.object({
  name: textSchema(100),
}).strict();

// Quyết định cho nội dung bị AI gắn cờ; chấp nhận cả chữ hoa/thường do client cũ gửi chữ thường.
// contentVersion giúp phát hiện nội dung đã bị sửa sau khi gắn cờ (tránh duyệt nhầm bản mới).
export const resolveAiFlaggedItemSchema = z.object({
  entityType: z.enum(['POST', 'COMMENT', 'post', 'comment']),
  entityId: z.coerce.number().int().positive(),
  action: z.enum(['APPROVE', 'REJECT', 'REMOVE', 'DELETE', 'approve', 'reject', 'remove', 'delete']),
  notes: z.string().trim().max(500).optional(),
  contentVersion: z.coerce.number().int().min(0).optional(),
}).strict();

// Cập nhật báo cáo: trạng thái theo REPORT_STATUS, kèm hành động xử lý tùy chọn (không làm gì / ẩn nội dung).
export const updateReportStatusSchema = z.object({
  status: z.enum(Object.values(REPORT_STATUS)),
  resolutionAction: z.enum(['NONE', 'HIDE_CONTENT', 'none', 'hide_content']).optional(),
}).strict();

// Đặt lại hạn mức khách: bắt buộc có guestId hoặc guest_id (một trong hai).
export const resetGuestQuotaSchema = z.object({
  guest_id: z.string().trim().min(1).max(100).optional(),
  guestId: z.string().trim().min(1).max(100).optional(),
}).strict().refine(
  (data) => Boolean(data.guest_id || data.guestId),
  { message: 'Mã khách (guestId hoặc guest_id) là bắt buộc' }
);

// Tham số URL guestId: chuỗi 1–100 ký tự.
export const guestIdParamSchema = z.object({
  guestId: z.string().trim().min(1).max(100),
}).strict();

// Số ngày lưu trữ tùy chọn khi xem thống kê, tối đa 1 năm.
export const retentionStatsQuerySchema = z.object({
  retentionDays: z.coerce.number().int().positive().max(365).optional(),
});
