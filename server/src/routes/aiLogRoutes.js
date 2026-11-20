// d:\Projects\FPT\SWP391\server\src/routes/aiLogRoutes.js
// Router nhật ký gọi AI (/api/v1/ai-logs) dành cho quản trị viên.
import { Router } from 'express';
import { listAiLogs, getAiLogStats } from '../controllers/aiLogController.js';
import { ROLES } from '../constants/roles.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { aiLogQuerySchema, aiLogStatsQuerySchema, validateAiLogQuery } from '../validators/aiLogValidator.js';

const router = Router();
// Nhật ký AI chứa dữ liệu nhạy cảm nên chỉ ADMIN được xem.
router.use(authenticate, authorize(ROLES.ADMIN));
// GET /ai-logs/stats — [ADMIN] Thống kê nhật ký AI theo khoảng thời gian/tính năng.
router.get('/stats', validateAiLogQuery(aiLogStatsQuerySchema), getAiLogStats);
// GET /ai-logs — [ADMIN] Danh sách nhật ký AI có lọc và phân trang.
router.get('/', validateAiLogQuery(aiLogQuerySchema), listAiLogs);
export default router;
