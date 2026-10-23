// d:\Projects\FPT\SWP391\server\src\routes\auth.route.js
import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { schemas } from '../validators/index.js';

const router = express.Router();

router.post('/register', authLimiter, validate(schemas.register), authController.register);
router.post('/login', authLimiter, validate(schemas.login), authController.login);
router.post('/refresh', authLimiter, authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, validate(schemas.updateMe), authController.updateMe);

export default router;
