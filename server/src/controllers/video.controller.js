// d:\Projects\FPT\SWP391\server\src\controllers\video.controller.js
import { videoService } from '../services/video.service.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

export const createVideo = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    author_id: req.user.user_id,
  };
  const newVideo = await videoService.createVideo(payload);
  return sendCreated(res, { video: newVideo });
});

export const getAllVideos = asyncHandler(async (req, res) => {
  const result = await videoService.getAllVideos(req.query);
  if (result && result.meta) {
    return sendSuccess(res, { videos: result.videos, meta: result.meta });
  }
  return sendSuccess(res, { videos: result });
});

export const getVideoById = asyncHandler(async (req, res) => {
  const video = await videoService.getVideoById(req.params.id);
  return sendSuccess(res, { video });
});

export const updateVideo = asyncHandler(async (req, res) => {
  const updated = await videoService.updateVideo(req.params.id, req.body, req.user);
  return sendSuccess(res, { video: updated });
});

export const deleteVideo = asyncHandler(async (req, res) => {
  const result = await videoService.deleteVideo(req.params.id, req.user);
  return sendSuccess(res, result);
});
