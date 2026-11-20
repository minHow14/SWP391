// d:\Projects\FPT\SWP391\server\src\controllers\video.controller.js
// Controller video công thức: CRUD video, tác giả lấy từ token, trả 202 khi chờ AI kiểm duyệt.
import { videoService } from '../services/video.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

// Đăng video với author_id từ token (chống giả mạo); 202 kèm jobId nếu đang chờ kiểm duyệt.
export const createVideo = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    author_id: req.user.user_id,
  };
  const { jobId, moderationStatus, ...video } = await videoService.createVideo(payload);
  return sendSuccess(
    res,
    { video, ...(jobId && { jobId, moderationStatus }) },
    jobId ? HTTP_STATUS.ACCEPTED : HTTP_STATUS.CREATED
  );
});

// Danh sách video, có hoặc không phân trang.
export const getAllVideos = asyncHandler(async (req, res) => {
  const result = await videoService.getAllVideos(req.query);
  if (result && result.meta) {
    return sendSuccess(res, { videos: result.videos, meta: result.meta });
  }
  return sendSuccess(res, { videos: result });
});

// Chi tiết video; req.user (nếu có) để trả thêm thông tin riêng của người xem.
export const getVideoById = asyncHandler(async (req, res) => {
  const video = await videoService.getVideoById(req.params.id, req.user);
  return sendSuccess(res, { video });
});

// Cập nhật video (chỉ chủ video); 202 nếu cần kiểm duyệt lại.
export const updateVideo = asyncHandler(async (req, res) => {
  const { jobId, moderationStatus, ...video } = await videoService.updateVideo(req.params.id, req.body, req.user);
  return sendSuccess(
    res,
    { video, ...(jobId && { jobId, moderationStatus }) },
    jobId ? HTTP_STATUS.ACCEPTED : HTTP_STATUS.OK
  );
});

// Xóa video (chỉ chủ video).
export const deleteVideo = asyncHandler(async (req, res) => {
  const result = await videoService.deleteVideo(req.params.id, req.user);
  return sendSuccess(res, result);
});
