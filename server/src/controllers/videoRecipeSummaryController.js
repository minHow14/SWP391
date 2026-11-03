// D:/SWP391/SWP391/server/src/controllers/videoRecipeSummaryController.js
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { videoRecipeSummaryService as service } from '../services/videoRecipeSummaryService.js';

const respond = (req, res, result) => res.status(result.status || 200).json({ success: true,
  message: result.status === 202 ? 'Đã tiếp nhận yêu cầu xử lý video.' : 'Lấy dữ liệu công thức video thành công.',
  data: result.data, meta: { ...result.meta, requestId: req.id } });
const ownedJob = (req) => ({ id: req.params.jobId, userId: req.user.user_id });

export const createVideoRecipeSummaryJob = asyncHandler(async (req, res) => {
  respond(req, res, await service.create({ ...res.locals.videoRecipeInput, userId: req.user.user_id }));
});
export const listVideoRecipeSummaryJobs = asyncHandler(async (req, res) => {
  respond(req, res, await service.list({ ...res.locals.videoRecipeInput, userId: req.user.user_id }));
});
export const getVideoRecipeSummaryJob = asyncHandler(async (req, res) => {
  respond(req, res, { data: await service.getJob(ownedJob(req)) });
});
export const retryVideoRecipeSummaryJob = asyncHandler(async (req, res) => {
  respond(req, res, await service.retry(ownedJob(req)));
});
export const getVideoRecipeSummary = asyncHandler(async (req, res) => {
  respond(req, res, { data: await service.getSummary({ id: req.params.summaryId, userId: req.user.user_id }) });
});
