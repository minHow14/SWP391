// d:\Projects\FPT\SWP391\server\src/routes/ai.route.js
// Router AI (/api/v1/ai): chatbot, lập thực đơn và quét món ăn qua AI Service.
// Cho phép cả khách (theo guestId, có hạn mức) lẫn người dùng đã đăng nhập.
import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { authenticateAiCaller, resolveAiIdentity } from '../middlewares/aiIdentityMiddleware.js';
import { aiChatSchema, aiMealPlanSchema, validateAiBody } from '../validators/aiRequestValidator.js';
import { foodScanSchema } from '../validators/aiFoodScanValidator.js';

const router = Router();

// Token đã gửi lên phải hợp lệ; chỉ yêu cầu không có token mới được xử lý như khách.
router.use(authenticateAiCaller, resolveAiIdentity);

// Quản lý hạn mức câu hỏi của khách & tài khoản
// GET /ai/usage, /ai/chat/usage — [Khách hoặc thành viên] Xem số lượt hỏi AI còn lại.
router.get('/usage', aiController.getUsage);
router.get('/chat/usage', aiController.getUsage);

// Streaming Server-Sent Events qua AI Microservice
// POST /ai/chat/stream — [Khách hoặc thành viên] Hỏi chatbot, trả lời dạng stream SSE.
router.post('/chat/stream', validateAiBody(aiChatSchema), aiController.streamChat);
// POST /ai/meal-planner/generate/stream — [Khách hoặc thành viên] Sinh thực đơn bằng AI, stream SSE.
router.post('/meal-planner/generate/stream', validateAiBody(aiMealPlanSchema), aiController.streamMealPlan);

// Kiểm tra món ăn & nhãn thành phần qua hình ảnh
// POST /ai/food-scanner/analyze — [Khách hoặc thành viên] Phân tích ảnh món ăn/nhãn thành phần.
router.post('/food-scanner/analyze', validateAiBody(foodScanSchema), aiController.analyzeFoodImage);

export default router;
