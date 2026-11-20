// d:\Projects\FPT\SWP391\server\src\controllers\vote.controller.js
// Controller bình chọn bài viết: tạo/đổi/hủy vote và xem tổng hợp vote.
import { voteService } from '../services/vote.service.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

// Vote mới trả 201, đổi chiều vote hiện có trả 200.
export const castOrUpdateVote = asyncHandler(async (req, res) => {
  // Lấy user_id trực tiếp từ token người dùng (chống giả mạo vote của người khác)
  const payload = {
    ...req.body,
    user_id: req.user.user_id,
  };
  const result = await voteService.castOrUpdateVote(payload);
  if (result.isNew) {
    return sendCreated(res, {
      message: result.message,
      vote: result.vote,
    });
  }
  return sendSuccess(res, {
    message: result.message,
    vote: result.vote,
  });
});

// Hủy vote; postId lấy từ params (chuẩn mới), body hoặc query (client cũ).
export const removeVote = asyncHandler(async (req, res) => {
  // Lấy user_id từ token, post_id từ params hoặc body
  const user_id = req.user.user_id;
  const post_id = req.params?.postId || req.body?.post_id || req.query?.post_id;
  const result = await voteService.removeVote({ user_id, post_id });
  return sendSuccess(res, result);
});

// Tổng hợp số upvote/downvote của bài viết.
export const getPostVoteSummary = asyncHandler(async (req, res) => {
  const summary = await voteService.getPostVoteSummary(req.params.postId);
  return sendSuccess(res, { summary });
});
