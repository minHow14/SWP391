// D:/SWP391/SWP391/server/src/routes/contentModerationRoutes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { contentModerationJobParamsSchema, contentModerationPageSchema } from '../validators/contentModerationValidator.js';
import { getContentModerationJob, listContentModerationJobs } from '../controllers/contentModerationController.js';

export const contentModerationRoutes = Router();
contentModerationRoutes.get('/', authenticate, validate(contentModerationPageSchema, 'query'), listContentModerationJobs);
contentModerationRoutes.get('/:jobId', authenticate,
  validate(contentModerationJobParamsSchema, 'params'), getContentModerationJob);
