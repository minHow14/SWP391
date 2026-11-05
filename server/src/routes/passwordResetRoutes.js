// D:/SWP391/SWP391/server/src/routes/passwordResetRoutes.js
import { Router } from 'express';
import { forgotPassword, resetPassword } from '../controllers/passwordResetController.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { forgotPasswordSchema, resetPasswordSchema } from '../validators/passwordResetValidator.js';

const router = Router();
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
export default router;
