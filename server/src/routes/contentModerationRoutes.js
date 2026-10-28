// D:/SWP391/SWP391/server/src/routes/contentModerationRoutes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { contentModerationJobParamsSchema } from '../validators/contentModerationValidator.js';
import { getContentModerationJob } from '../controllers/contentModerationController.js';

export const contentModerationRoutes = Router();
contentModerationRoutes.get('/:jobId', authenticate,
  validate(contentModerationJobParamsSchema, 'params'), getContentModerationJob);
