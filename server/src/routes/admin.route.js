// D:/SWP391/SWP391/server/src/routes/admin.route.js
// Router khu vực quản trị (/api/v1/admin): dashboard, thành viên, bài viết, bình luận, danh mục,
// kiểm duyệt AI, giám sát AI, hạn mức khách và báo cáo vi phạm. Chỉ ADMIN được truy cập.
import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { ROLES } from '../constants/roles.js';
import { idParamsSchema } from '../validators/common.validator.js';
import {
  updateUserStatusSchema,
  updatePostStatusSchema,
  updatePostSchema,
  updateCommentStatusSchema,
  createCategorySchema,
  updateCategorySchema,
  resolveAiFlaggedItemSchema,
  updateReportStatusSchema,
  resetGuestQuotaSchema,
  guestIdParamSchema,
  retentionStatsQuerySchema,
} from '../validators/admin.validator.js';

const router = express.Router();

// Tất cả các endpoint quản trị đều bắt buộc đăng nhập và có quyền ADMIN (Role 1)
router.use(authenticate, authorize(ROLES.ADMIN));

// FE-10: Dashboard tổng quan
// GET /admin/dashboard/stats — [ADMIN] Số liệu tổng quan cho dashboard quản trị.
router.get('/dashboard/stats', adminController.getDashboardStats);
// GET /admin/system-health — [ADMIN] Kiểm tra tình trạng DB, AI Service và các thành phần hệ thống.
router.get('/system-health', adminController.getSystemHealth);

// Bảo trì & Data Retention (Xóa mềm 30 ngày & tự động xóa cứng)
// GET /admin/maintenance/retention-stats — [ADMIN] Thống kê bản ghi đã xóa mềm sắp hết hạn lưu trữ.
router.get('/maintenance/retention-stats', validate(retentionStatsQuerySchema, 'query'), adminController.getRetentionStats);
// POST /admin/maintenance/purge-expired — [ADMIN] Xóa cứng thủ công các bản ghi xóa mềm đã quá hạn lưu trữ.
router.post('/maintenance/purge-expired', adminController.purgeExpiredItems);

// FE-01: Quản lý thành viên
// GET /admin/users — [ADMIN] Danh sách thành viên có lọc/phân trang.
router.get('/users', adminController.getUsers);
// GET /admin/users/:id/content — [ADMIN] Xem nội dung (bài viết, bình luận) do một thành viên tạo.
router.get('/users/:id/content', validate(idParamsSchema, 'params'), adminController.getUserContent);
// PATCH /admin/users/:id/status — [ADMIN] Khóa/mở khóa tài khoản thành viên.
router.patch('/users/:id/status', validate(idParamsSchema, 'params'), validate(updateUserStatusSchema), adminController.updateUserStatus);
// DELETE /admin/users/:id — [ADMIN] Xóa mềm tài khoản thành viên.
router.delete('/users/:id', validate(idParamsSchema, 'params'), adminController.deleteUser);
// POST /admin/users/:id/restore — [ADMIN] Khôi phục tài khoản đã xóa mềm.
router.post('/users/:id/restore', validate(idParamsSchema, 'params'), adminController.restoreUser);

// FE-02: Quản lý bài viết & video
// GET /admin/posts — [ADMIN] Danh sách bài viết & video để quản lý.
router.get('/posts', adminController.getPosts);
// PATCH /admin/posts/:id/status — [ADMIN] Duyệt/ẩn/từ chối bài viết.
router.patch('/posts/:id/status', validate(idParamsSchema, 'params'), validate(updatePostStatusSchema), adminController.updatePostStatus);
// PUT /admin/posts/:id — [ADMIN] Chỉnh sửa nội dung bài viết thay người dùng.
router.put('/posts/:id', validate(idParamsSchema, 'params'), validate(updatePostSchema), adminController.updatePost);
// DELETE /admin/posts/:id — [ADMIN] Xóa mềm bài viết.
router.delete('/posts/:id', validate(idParamsSchema, 'params'), adminController.deletePost);
// POST /admin/posts/:id/restore — [ADMIN] Khôi phục bài viết đã xóa mềm.
router.post('/posts/:id/restore', validate(idParamsSchema, 'params'), adminController.restorePost);

// FE-03: Quản lý bình luận
// GET /admin/comments — [ADMIN] Danh sách bình luận để kiểm duyệt.
router.get('/comments', adminController.getComments);
// PATCH /admin/comments/:id/status — [ADMIN] Đổi trạng thái hiển thị của bình luận.
router.patch('/comments/:id/status', validate(idParamsSchema, 'params'), validate(updateCommentStatusSchema), adminController.updateCommentStatus);
// DELETE /admin/comments/:id — [ADMIN] Xóa mềm bình luận.
router.delete('/comments/:id', validate(idParamsSchema, 'params'), adminController.deleteComment);
// POST /admin/comments/:id/restore — [ADMIN] Khôi phục bình luận đã xóa mềm.
router.post('/comments/:id/restore', validate(idParamsSchema, 'params'), adminController.restoreComment);

// FE-04: Quản lý danh mục
// GET /admin/categories — [ADMIN] Danh sách danh mục.
router.get('/categories', adminController.getCategories);
// POST /admin/categories — [ADMIN] Tạo danh mục mới.
router.post('/categories', validate(createCategorySchema), adminController.createCategory);
// PUT /admin/categories/:id — [ADMIN] Cập nhật danh mục.
router.put('/categories/:id', validate(idParamsSchema, 'params'), validate(updateCategorySchema), adminController.updateCategory);
// DELETE /admin/categories/:id — [ADMIN] Xóa danh mục.
router.delete('/categories/:id', validate(idParamsSchema, 'params'), adminController.deleteCategory);

// FE-05: Kiểm duyệt nội dung gắn cờ AI
// GET /admin/moderation/flagged — [ADMIN] Danh sách nội dung bị AI gắn cờ chờ xử lý.
router.get('/moderation/flagged', adminController.getAiFlaggedContent);
// POST /admin/moderation/resolve — [ADMIN] Ra quyết định (duyệt/gỡ) cho một nội dung bị AI gắn cờ.
router.post('/moderation/resolve', validate(resolveAiFlaggedItemSchema), adminController.resolveAiFlaggedItem);

// FE-06 & FE-07: Giám sát mô hình AI, xem logs & metrics
// GET /admin/ai/models — [ADMIN] Thông tin các mô hình AI đang dùng.
router.get('/ai/models', adminController.getAiModels);
// GET /admin/ai/logs — [ADMIN] Nhật ký các lần gọi AI.
router.get('/ai/logs', adminController.getAiLogs);
// GET /admin/ai/metrics — [ADMIN] Chỉ số hiệu năng AI (độ trễ, tỉ lệ lỗi...).
router.get('/ai/metrics', adminController.getAiMetrics);
// GET /admin/ai/stats — [ADMIN] Thống kê tổng hợp nhật ký AI.
router.get('/ai/stats', adminController.getAiLogStats);

// Alias hỗ trợ tương thích ngược với các trang quản trị
// GET /admin/ai-logs, /admin/ai-logs/stats — [ADMIN] Alias cũ của /ai/logs và /ai/stats.
router.get('/ai-logs', adminController.getAiLogs);
router.get('/ai-logs/stats', adminController.getAiLogStats);
// GET /admin/guest-quota/:guestId — [ADMIN] Alias cũ: xem hạn mức hỏi AI của một khách.
router.get('/guest-quota/:guestId', validate(guestIdParamSchema, 'params'), adminController.getGuestQuota);
// POST /admin/guest-quota/reset — [ADMIN] Alias cũ: đặt lại hạn mức của khách.
router.post('/guest-quota/reset', validate(resetGuestQuotaSchema), adminController.resetGuestQuota);
// POST /admin/chatbot-cache/clear — [ADMIN] Alias cũ: xóa cache câu trả lời chatbot.
router.post('/chatbot-cache/clear', adminController.clearChatCache);

// FE-08: Can thiệp thủ công AI & Quản lý hạn mức
// POST /admin/ai/intervene — [ADMIN] Can thiệp thủ công vào kết quả/hành vi AI.
router.post('/ai/intervene', adminController.interveneAi);
// GET /admin/ai/guest-quota/:guestId — [ADMIN] Xem hạn mức hỏi AI còn lại của một khách.
router.get('/ai/guest-quota/:guestId', validate(guestIdParamSchema, 'params'), adminController.getGuestQuota);
// POST /admin/ai/guest-quota/reset — [ADMIN] Đặt lại hạn mức hỏi AI của khách.
router.post('/ai/guest-quota/reset', validate(resetGuestQuotaSchema), adminController.resetGuestQuota);
// POST /admin/ai/chatbot-cache/clear — [ADMIN] Xóa cache chatbot để AI trả lời lại từ đầu.
router.post('/ai/chatbot-cache/clear', adminController.clearChatCache);

// FE-09: Quản lý báo cáo vi phạm
// GET /admin/reports — [ADMIN] Danh sách báo cáo vi phạm từ người dùng.
router.get('/reports', adminController.getReports);
// PATCH /admin/reports/:id — [ADMIN] Cập nhật trạng thái xử lý báo cáo.
router.patch('/reports/:id', validate(idParamsSchema, 'params'), validate(updateReportStatusSchema), adminController.updateReportStatus);

export default router;
