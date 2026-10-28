// D:/SWP391/SWP391/server/src/controllers/contentModerationController.js
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { contentModerationService } from '../services/contentModerationService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getContentModerationJob = asyncHandler(async (req, res) => {
  const job = await contentModerationService.getJob({ id: req.params.jobId, user: req.user });
  return sendSuccess(res, { job });
});
