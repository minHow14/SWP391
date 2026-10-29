// server/src/routes/videoRecipeSummaryRoutes.js
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/authMiddleware.js';
import { videoRecipeSummaryError } from '../utils/videoRecipeSummaryError.js';
import { createVideoRecipeSummarySchema, videoRecipeJobParamsSchema, videoRecipeSummaryParamsSchema,
  videoRecipePageSchema } from '../validators/videoRecipeSummaryValidator.js';
import { createVideoRecipeSummaryJob, listVideoRecipeSummaryJobs, getVideoRecipeSummaryJob,
  retryVideoRecipeSummaryJob, getVideoRecipeSummary } from '../controllers/videoRecipeSummaryController.js';

function validated(schema, source) {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (result.success) { res.locals.videoRecipeInput = result.data; return next(); }
    const error = videoRecipeSummaryError({ status: 400, code: 'INVALID_INPUT', message: 'Dữ liệu yêu cầu không hợp lệ.' });
    error.details = result.error.issues.map((issue) => ({ field: issue.path.join('.') || source, message: issue.message }));
    next(error);
  };
}

export const videoRecipeSummaryJobRoutes = Router();
videoRecipeSummaryJobRoutes.use(authenticate);
videoRecipeSummaryJobRoutes.post('/', validated(createVideoRecipeSummarySchema, 'body'), createVideoRecipeSummaryJob);
videoRecipeSummaryJobRoutes.get('/', validated(videoRecipePageSchema, 'query'), listVideoRecipeSummaryJobs);
videoRecipeSummaryJobRoutes.get('/:jobId', validated(videoRecipeJobParamsSchema, 'params'), getVideoRecipeSummaryJob);
videoRecipeSummaryJobRoutes.post('/:jobId/retries', validated(videoRecipeJobParamsSchema, 'params'),
  validated(z.object({}).strict(), 'body'), retryVideoRecipeSummaryJob);

export const videoRecipeSummaryRoutes = Router();
videoRecipeSummaryRoutes.use(authenticate);
videoRecipeSummaryRoutes.get('/:summaryId', validated(videoRecipeSummaryParamsSchema, 'params'), getVideoRecipeSummary);
