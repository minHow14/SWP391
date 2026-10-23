// d:\Projects\FPT\SWP391\server\src\controllers\comment.controller.js
import { commentService } from '../services/comment.service.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

export const createComment = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    user_id: req.user.user_id,
  };
  const newComment = await commentService.createComment(payload);
  return sendCreated(res, { comment: newComment });
});

export const getCommentsByPost = asyncHandler(async (req, res) => {
  const result = await commentService.getCommentsByPost(req.params.postId, req.query);
  if (result && result.meta) {
    return sendSuccess(res, { comments: result.comments, meta: result.meta });
  }
  return sendSuccess(res, { comments: result });
});

export const updateComment = asyncHandler(async (req, res) => {
  const updated = await commentService.updateComment(req.params.id, req.body, req.user);
  return sendSuccess(res, { comment: updated });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const result = await commentService.deleteComment(req.params.id, req.user);
  return sendSuccess(res, result);
});
