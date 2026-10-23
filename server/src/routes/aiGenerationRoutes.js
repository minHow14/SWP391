// D:/SWP391/SWP391/server/src/routes/aiGenerationRoutes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateAiGeneration } from '../validators/aiGenerationValidator.js';
import { getAiGeneration, listAiGenerations } from '../controllers/aiGenerationController.js';

const router = Router();
router.use(authenticate);
router.get('/', validateAiGeneration, listAiGenerations);
router.get('/:id', validateAiGeneration, getAiGeneration);
export default router;
