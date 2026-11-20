// d:\Projects\FPT\SWP391\server\src\routes\report.route.js
// Router báo cáo vi phạm nội dung (/api/v1/reports).
import express from 'express';
import * as reportController from '../controllers/report.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { schemas } from '../validators/index.js';

const router = express.Router();

// POST /reports — [Đăng nhập] Gửi báo cáo vi phạm cho bài viết/bình luận.
router.post('/', authenticate, validate(schemas.createReport), reportController.createReport);

export default router;
