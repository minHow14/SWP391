// d:\Projects\FPT\SWP391\server\src\services\report.service.js
import { reportRepository } from '../repositories/report.repository.js';
import { commentRepository } from '../repositories/comment.repository.js';
import { postRepository } from '../repositories/post.repository.js';
import { ApiError } from '../utils/apiError.js';
import { REPORT_STATUS, POST_STATUS, COMMENT_STATUS } from '../constants/status.js';

export const createReport = async (userId, { postId, commentId, reason }) => {
  // ƯU TIÊN 1: BÁO CÁO BÌNH LUẬN (nếu có commentId)
  if (commentId) {
    const comment = await commentRepository.findById(commentId, { post: true });
    if (!comment || comment.status === COMMENT_STATUS.DELETED) {
      throw ApiError.notFound('Bình luận không tồn tại hoặc đã bị xóa');
    }
    if (comment.user_id === userId) {
      throw ApiError.badRequest('Bạn không thể tự báo cáo bình luận của chính mình');
    }

    // Kiểm tra trùng lặp báo cáo đang chờ xử lý cho bình luận này
    const existing = await reportRepository.findFirstReport({
      reporter_id: userId,
      comment_id: commentId,
      status: REPORT_STATUS.PENDING,
    });
    if (existing) {
      throw ApiError.conflict('Bạn đã gửi một báo cáo đang chờ xử lý cho bình luận này');
    }

    return reportRepository.createReport(
      {
        reporter_id: userId,
        comment_id: commentId,
        post_id: comment.post_id,
        reason,
        status: REPORT_STATUS.PENDING,
      },
      {
        comment: {
          select: {
            comment_id: true,
            content: true,
            post_id: true,
          },
        },
        post: {
          select: {
            post_id: true,
            blog: { select: { title: true } },
            video: { select: { title: true } },
          },
        },
      }
    );
  }

  // ƯU TIÊN 2: BÁO CÁO BÀI VIẾT (chỉ có postId, không có commentId)
  if (postId) {
    const post = await postRepository.findPostById(postId);
    if (!post || post.status === POST_STATUS.DELETED) {
      throw ApiError.notFound('Bài viết không tồn tại hoặc đã bị gỡ');
    }
    if (post.author_id === userId) {
      throw ApiError.badRequest('Bạn không thể tự báo cáo bài viết của chính mình');
    }

    // Kiểm tra trùng lặp báo cáo đang chờ xử lý cho bài viết này
    const existing = await reportRepository.findFirstReport({
      reporter_id: userId,
      post_id: postId,
      comment_id: null,
      status: REPORT_STATUS.PENDING,
    });
    if (existing) {
      throw ApiError.conflict('Bạn đã gửi một báo cáo đang chờ xử lý cho bài viết này');
    }

    return reportRepository.createReport(
      {
        reporter_id: userId,
        post_id: postId,
        comment_id: null,
        reason,
        status: REPORT_STATUS.PENDING,
      },
      {
        post: {
          select: {
            post_id: true,
            post_type: true,
            blog: { select: { title: true } },
            video: { select: { title: true } },
          },
        },
      }
    );
  }

  throw ApiError.badRequest('Cần cung cấp mã bài viết hoặc mã bình luận để báo cáo');
};
