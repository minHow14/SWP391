// D:/SWP391/SWP391/server/src/routes/admin.route.js
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
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/system-health', adminController.getSystemHealth);

// Bảo trì & Data Retention (Xóa mềm 30 ngày & tự động xóa cứng)
router.get('/maintenance/retention-stats', validate(retentionStatsQuerySchema, 'query'), adminController.getRetentionStats);
router.post('/maintenance/purge-expired', adminController.purgeExpiredItems);

// FE-01: Quản lý thành viên
router.get('/users', adminController.getUsers);
router.get('/users/:id/content', validate(idParamsSchema, 'params'), adminController.getUserContent);
router.patch('/users/:id/status', validate(idParamsSchema, 'params'), validate(updateUserStatusSchema), adminController.updateUserStatus);
router.delete('/users/:id', validate(idParamsSchema, 'params'), adminController.deleteUser);
router.post('/users/:id/restore', validate(idParamsSchema, 'params'), adminController.restoreUser);

// FE-02: Quản lý bài viết & video
router.get('/posts', adminController.getPosts);
router.patch('/posts/:id/status', validate(idParamsSchema, 'params'), validate(updatePostStatusSchema), adminController.updatePostStatus);
router.put('/posts/:id', validate(idParamsSchema, 'params'), validate(updatePostSchema), adminController.updatePost);
router.delete('/posts/:id', validate(idParamsSchema, 'params'), adminController.deletePost);
router.post('/posts/:id/restore', validate(idParamsSchema, 'params'), adminController.restorePost);

// FE-03: Quản lý bình luận
router.get('/comments', adminController.getComments);
router.patch('/comments/:id/status', validate(idParamsSchema, 'params'), validate(updateCommentStatusSchema), adminController.updateCommentStatus);
router.delete('/comments/:id', validate(idParamsSchema, 'params'), adminController.deleteComment);
router.post('/comments/:id/restore', validate(idParamsSchema, 'params'), adminController.restoreComment);

// FE-04: Quản lý danh mục
router.get('/categories', adminController.getCategories);
router.post('/categories', validate(createCategorySchema), adminController.createCategory);
router.put('/categories/:id', validate(idParamsSchema, 'params'), validate(updateCategorySchema), adminController.updateCategory);
router.delete('/categories/:id', validate(idParamsSchema, 'params'), adminController.deleteCategory);

// FE-05: Kiểm duyệt nội dung gắn cờ AI
router.get('/moderation/flagged', adminController.getAiFlaggedContent);
router.post('/moderation/resolve', validate(resolveAiFlaggedItemSchema), adminController.resolveAiFlaggedItem);

// FE-06 & FE-07: Giám sát mô hình AI, xem logs & metrics
router.get('/ai/models', adminController.getAiModels);
router.get('/ai/logs', adminController.getAiLogs);
router.get('/ai/metrics', adminController.getAiMetrics);
router.get('/ai/stats', adminController.getAiLogStats);

// Alias hỗ trợ tương thích ngược với các trang quản trị
router.get('/ai-logs', adminController.getAiLogs);
router.get('/ai-logs/stats', adminController.getAiLogStats);
router.get('/guest-quota/:guestId', validate(guestIdParamSchema, 'params'), adminController.getGuestQuota);
router.post('/guest-quota/reset', validate(resetGuestQuotaSchema), adminController.resetGuestQuota);
router.post('/chatbot-cache/clear', adminController.clearChatCache);

// FE-08: Can thiệp thủ công AI & Quản lý hạn mức
router.post('/ai/intervene', adminController.interveneAi);
router.get('/ai/guest-quota/:guestId', validate(guestIdParamSchema, 'params'), adminController.getGuestQuota);
router.post('/ai/guest-quota/reset', validate(resetGuestQuotaSchema), adminController.resetGuestQuota);
router.post('/ai/chatbot-cache/clear', adminController.clearChatCache);

// FE-09: Quản lý báo cáo vi phạm
router.get('/reports', adminController.getReports);
router.patch('/reports/:id', validate(idParamsSchema, 'params'), validate(updateReportStatusSchema), adminController.updateReportStatus);

export default router;
