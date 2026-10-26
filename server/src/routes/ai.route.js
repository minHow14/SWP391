// d:\Projects\FPT\SWP391\server\src/routes/ai.route.js
import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { authenticateAiCaller } from '../middlewares/aiIdentityMiddleware.js';
import { aiChatSchema, aiMealPlanSchema, validateAiBody } from '../validators/aiRequestValidator.js';
import { foodScanSchema } from '../validators/aiFoodScanValidator.js';

const router = Router();

// Token đã gửi lên phải hợp lệ; chỉ yêu cầu không có token mới được xử lý như khách.
router.use(authenticateAiCaller);

// Quản lý hạn mức câu hỏi của khách & tài khoản
router.get('/usage', aiController.getUsage);
router.get('/chat/usage', aiController.getUsage);

// Streaming Server-Sent Events qua AI Microservice
router.post('/chat/stream', validateAiBody(aiChatSchema), aiController.streamChat);
router.post('/meal-planner/generate/stream', validateAiBody(aiMealPlanSchema), aiController.streamMealPlan);

// Kiểm tra món ăn & nhãn thành phần qua hình ảnh
router.post('/food-scanner/analyze', validateAiBody(foodScanSchema), aiController.analyzeFoodImage);

export default router;
