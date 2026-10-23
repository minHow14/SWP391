// d:\Projects\FPT\SWP391\server\src/routes/aiLogRoutes.js
import { Router } from 'express';
import { listAiLogs, getAiLogStats } from '../controllers/aiLogController.js';
import { ROLES } from '../constants/roles.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { aiLogQuerySchema, aiLogStatsQuerySchema, validateAiLogQuery } from '../validators/aiLogValidator.js';

const router = Router();
router.use(authenticate, authorize(ROLES.ADMIN));
router.get('/stats', validateAiLogQuery(aiLogStatsQuerySchema), getAiLogStats);
router.get('/', validateAiLogQuery(aiLogQuerySchema), listAiLogs);
export default router;
