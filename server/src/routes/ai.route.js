// d:\Projects\FPT\SWP391\server\src\routes\ai.route.js
import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { optionalAuthenticate } from '../middlewares/authMiddleware.js';

const router = Router();

// Gắn optionalAuthenticate để nhận diện nếu người dùng đã đăng nhập
router.use(optionalAuthenticate);

// Quản lý hạn mức câu hỏi của khách & tài khoản
router.get('/usage', aiController.getUsage);
router.get('/chat/usage', aiController.getUsage);

// Streaming Server-Sent Events qua AI Microservice
router.post('/chat/stream', aiController.streamChat);
router.post('/meal-planner/generate/stream', aiController.streamMealPlan);

export default router;
