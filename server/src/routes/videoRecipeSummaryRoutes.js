// D:/SWP391/SWP391/server/src/routes/videoRecipeSummaryRoutes.js
// Router tóm tắt công thức từ video bằng AI: job (/api/v1/video-recipe-summary-jobs)
// và kết quả tóm tắt (/api/v1/video-recipe-summaries). Tất cả đều cần đăng nhập.
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/authMiddleware.js';
import { videoRecipeSummaryError } from '../utils/videoRecipeSummaryError.js';
import { createVideoRecipeSummarySchema, videoRecipeJobParamsSchema, videoRecipeSummaryParamsSchema,
  videoRecipePageSchema } from '../validators/videoRecipeSummaryValidator.js';
import { createVideoRecipeSummaryJob, listVideoRecipeSummaryJobs, getVideoRecipeSummaryJob,
  retryVideoRecipeSummaryJob, getVideoRecipeSummary } from '../controllers/videoRecipeSummaryController.js';

// Middleware validate riêng cho tính năng này để trả lỗi đúng định dạng videoRecipeSummaryError
// (khác middleware validate chung). Dữ liệu hợp lệ lưu ở res.locals.videoRecipeInput.
// @param {import('zod').ZodTypeAny} schema - Schema Zod cần kiểm tra
// @param {'body'|'query'|'params'} source - Phần của request cần kiểm tra
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
// POST /video-recipe-summary-jobs — [Đăng nhập] Tạo job tóm tắt công thức từ một video.
videoRecipeSummaryJobRoutes.post('/', validated(createVideoRecipeSummarySchema, 'body'), createVideoRecipeSummaryJob);
// GET /video-recipe-summary-jobs — [Đăng nhập] Danh sách job tóm tắt của tôi (phân trang).
videoRecipeSummaryJobRoutes.get('/', validated(videoRecipePageSchema, 'query'), listVideoRecipeSummaryJobs);
// GET /video-recipe-summary-jobs/:jobId — [Đăng nhập, chủ job] Trạng thái một job.
videoRecipeSummaryJobRoutes.get('/:jobId', validated(videoRecipeJobParamsSchema, 'params'), getVideoRecipeSummaryJob);
// POST /video-recipe-summary-jobs/:jobId/retries — [Đăng nhập, chủ job] Chạy lại job thất bại; body phải rỗng.
videoRecipeSummaryJobRoutes.post('/:jobId/retries', validated(videoRecipeJobParamsSchema, 'params'),
  validated(z.object({}).strict(), 'body'), retryVideoRecipeSummaryJob);

export const videoRecipeSummaryRoutes = Router();
videoRecipeSummaryRoutes.use(authenticate);
// GET /video-recipe-summaries/:summaryId — [Đăng nhập] Xem bản tóm tắt công thức đã tạo.
videoRecipeSummaryRoutes.get('/:summaryId', validated(videoRecipeSummaryParamsSchema, 'params'), getVideoRecipeSummary);
