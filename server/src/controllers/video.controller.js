// d:\Projects\FPT\SWP391\server\src\controllers\video.controller.js
import { videoService } from '../services/video.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

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

export const getAllVideos = asyncHandler(async (req, res) => {
  const result = await videoService.getAllVideos(req.query);
  if (result && result.meta) {
    return sendSuccess(res, { videos: result.videos, meta: result.meta });
  }
  return sendSuccess(res, { videos: result });
});

export const getVideoById = asyncHandler(async (req, res) => {
  const video = await videoService.getVideoById(req.params.id, req.user);
  return sendSuccess(res, { video });
});

export const updateVideo = asyncHandler(async (req, res) => {
  const { jobId, moderationStatus, ...video } = await videoService.updateVideo(req.params.id, req.body, req.user);
  return sendSuccess(
    res,
    { video, ...(jobId && { jobId, moderationStatus }) },
    jobId ? HTTP_STATUS.ACCEPTED : HTTP_STATUS.OK
  );
});

export const deleteVideo = asyncHandler(async (req, res) => {
  const result = await videoService.deleteVideo(req.params.id, req.user);
  return sendSuccess(res, result);
});

