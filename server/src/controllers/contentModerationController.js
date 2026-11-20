// D:/SWP391/SWP391/server/src/controllers/contentModerationController.js
// Controller job kiểm duyệt nội dung bằng AI của người dùng.
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { contentModerationService } from '../services/contentModerationService.js';
import { sendSuccess } from '../utils/apiResponse.js';

// Danh sách job kiểm duyệt, chỉ lọc theo người dùng hiện tại.
export const listContentModerationJobs = asyncHandler(async (req, res) => {
  return sendSuccess(res, await contentModerationService.listJobs({ ...req.query, userId: req.user.user_id }));
});

// Chi tiết một job; truyền user để service kiểm tra quyền xem.
export const getContentModerationJob = asyncHandler(async (req, res) => {
  const job = await contentModerationService.getJob({ id: req.params.jobId, user: req.user });
  return sendSuccess(res, { job });
});
