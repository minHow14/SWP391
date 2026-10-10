import { voteService } from '../services/vote.service.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

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

export const removeVote = asyncHandler(async (req, res) => {
  // Lấy user_id từ token, post_id từ params hoặc body
  const user_id = req.user.user_id;
  const post_id = req.params?.postId || req.body?.post_id || req.query?.post_id;
  const result = await voteService.removeVote({ user_id, post_id });
  return sendSuccess(res, result);
});

export const getPostVoteSummary = asyncHandler(async (req, res) => {
  const summary = await voteService.getPostVoteSummary(req.params.postId);
  return sendSuccess(res, { summary });
});
