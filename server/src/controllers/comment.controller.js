// D:/SWP391/SWP391/server/src/controllers/comment.controller.js
// Controller bình luận: tạo/sửa/xóa/lấy bình luận theo bài viết, hỗ trợ kiểm duyệt AI bất đồng bộ.
import { commentService } from '../services/comment.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

// Tạo bình luận với user_id lấy từ token (chống giả mạo); 202 nếu đang chờ kiểm duyệt AI.
export const createComment = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    user_id: req.user.user_id,
  };
  const { jobId, moderationStatus, ...comment } = await commentService.createComment(payload);
  return sendSuccess(res, { comment, ...(jobId && { jobId, moderationStatus }) }, jobId ? HTTP_STATUS.ACCEPTED : HTTP_STATUS.CREATED);
});

// Danh sách bình luận của một bài viết, có hoặc không phân trang.
export const getCommentsByPost = asyncHandler(async (req, res) => {
  const result = await commentService.getCommentsByPost(req.params.postId, req.query);
  if (result && result.meta) {
    return sendSuccess(res, { comments: result.comments, meta: result.meta });
  }
  return sendSuccess(res, { comments: result });
});

// Sửa bình luận (chỉ chủ bình luận); 202 nếu cần kiểm duyệt lại.
export const updateComment = asyncHandler(async (req, res) => {
  const { jobId, moderationStatus, ...comment } = await commentService.updateComment(req.params.id, req.body, req.user);
  return sendSuccess(res, { comment, ...(jobId && { jobId, moderationStatus }) }, jobId ? HTTP_STATUS.ACCEPTED : HTTP_STATUS.OK);
});

// Xóa bình luận (chỉ chủ bình luận).
export const deleteComment = asyncHandler(async (req, res) => {
  const result = await commentService.deleteComment(req.params.id, req.user);
  return sendSuccess(res, result);
});
