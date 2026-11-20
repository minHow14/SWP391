// D:/SWP391/SWP391/server/src/controllers/videoRecipeSummaryController.js
// Controller tóm tắt công thức từ video bằng AI: tạo/xem/chạy lại job và xem bản tóm tắt.
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { videoRecipeSummaryService as service } from '../services/videoRecipeSummaryService.js';

// Trả response chuẩn; 202 nghĩa là job đã được tiếp nhận và đang xử lý nền.
const respond = (req, res, result) => res.status(result.status || 200).json({ success: true,
  message: result.status === 202 ? 'Đã tiếp nhận yêu cầu xử lý video.' : 'Lấy dữ liệu công thức video thành công.',
  data: result.data, meta: { ...result.meta, requestId: req.id } });
// Ghép jobId với userId để service chỉ trả job thuộc về người dùng hiện tại.
const ownedJob = (req) => ({ id: req.params.jobId, userId: req.user.user_id });

// Tạo job tóm tắt công thức từ video.
export const createVideoRecipeSummaryJob = asyncHandler(async (req, res) => {
  respond(req, res, await service.create({ ...res.locals.videoRecipeInput, userId: req.user.user_id }));
});
// Danh sách job tóm tắt của người dùng (phân trang).
export const listVideoRecipeSummaryJobs = asyncHandler(async (req, res) => {
  respond(req, res, await service.list({ ...res.locals.videoRecipeInput, userId: req.user.user_id }));
});
// Xem trạng thái một job của người dùng.
export const getVideoRecipeSummaryJob = asyncHandler(async (req, res) => {
  respond(req, res, { data: await service.getJob(ownedJob(req)) });
});
// Chạy lại một job đã thất bại.
export const retryVideoRecipeSummaryJob = asyncHandler(async (req, res) => {
  respond(req, res, await service.retry(ownedJob(req)));
});
// Xem bản tóm tắt công thức của người dùng.
export const getVideoRecipeSummary = asyncHandler(async (req, res) => {
  respond(req, res, { data: await service.getSummary({ id: req.params.summaryId, userId: req.user.user_id }) });
});
