// d:\Projects\FPT\SWP391\server\src/routes/aiGenerationRoutes.js
// Router lịch sử kết quả AI đã sinh (/api/v1/ai-generations) của chính người dùng.
import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateAiGeneration } from '../validators/aiGenerationValidator.js';
import { getAiGeneration, listAiGenerations } from '../controllers/aiGenerationController.js';

const router = Router();
// Chỉ người dùng đăng nhập mới xem được lịch sử AI của mình.
router.use(authenticate);
// GET /ai-generations — [Đăng nhập] Danh sách kết quả AI đã sinh của tôi.
router.get('/', validateAiGeneration, listAiGenerations);
// GET /ai-generations/:id — [Đăng nhập] Chi tiết một kết quả AI (chỉ chủ sở hữu).
router.get('/:id', validateAiGeneration, getAiGeneration);
export default router;
