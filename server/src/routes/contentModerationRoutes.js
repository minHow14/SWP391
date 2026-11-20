// D:/SWP391/SWP391/server/src/routes/contentModerationRoutes.js
// Router job kiểm duyệt nội dung bằng AI (/api/v1/content-moderation-jobs).
import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { contentModerationJobParamsSchema, contentModerationPageSchema } from '../validators/contentModerationValidator.js';
import { getContentModerationJob, listContentModerationJobs } from '../controllers/contentModerationController.js';

export const contentModerationRoutes = Router();
// GET /content-moderation-jobs — [Đăng nhập] Danh sách job kiểm duyệt của tôi (phân trang).
contentModerationRoutes.get('/', authenticate, validate(contentModerationPageSchema, 'query'), listContentModerationJobs);
// GET /content-moderation-jobs/:jobId — [Đăng nhập] Trạng thái/kết quả một job kiểm duyệt.
contentModerationRoutes.get('/:jobId', authenticate,
  validate(contentModerationJobParamsSchema, 'params'), getContentModerationJob);
