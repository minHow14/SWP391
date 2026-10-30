// D:/SWP391/SWP391/server/src/services/comment.service.js
import { commentRepository } from '../repositories/comment.repository.js';
import { postRepository } from '../repositories/post.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { POST_STATUS, COMMENT_STATUS } from '../constants/index.js';
import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/index.js';
import { notificationService } from './notification.service.js';
import { contentModerationService } from './contentModerationService.js';
import { contentModerationRepository } from '../repositories/contentModerationRepository.js';

const COMMENT_AUTHOR_INCLUDE = { user: { select: { user_id: true, full_name: true } } };

export const commentService = {
  /**
   * Tạo bình luận mới cho bài viết
   * user_id lấy từ người dùng đã xác thực
   */
  async createComment({ post_id, user_id, content }) {
    const numericPostId = Number(post_id);
    const numericUserId = Number(user_id);

    if (!numericPostId || !numericUserId || !content?.trim()) {
      throw ApiError.badRequest('Valid post_id, user_id, and content are required');
    }

    const targetPost = await postRepository.findPostById(numericPostId);
    if (!targetPost || targetPost.status !== POST_STATUS.PUBLISHED || targetPost.deleted_at) {
      throw ApiError.notFound('Target post not found or has been deleted');
    }

    const authorUser = await userRepository.findById(numericUserId);
    if (!authorUser) {
      throw ApiError.notFound('Commenter user not found');
    }

    const newComment = await contentModerationRepository.transaction(async (tx) => {
      const comment = await commentRepository.create({
        post_id: numericPostId,
        user_id: numericUserId,
        content: content.trim(),
        is_flagged_by_ai: false,
        status: COMMENT_STATUS.ACTIVE,
      }, COMMENT_AUTHOR_INCLUDE, tx);
      const moderation = await contentModerationService.queueComment({ comment }, tx);
      return { ...comment, ...moderation };
    });

    // Gửi thông báo đến tác giả bài viết nếu người bình luận không phải chính tác giả
    if (newComment.status === COMMENT_STATUS.ACTIVE && targetPost.author_id && targetPost.author_id !== numericUserId) {
      const commenterName = authorUser.full_name || 'Một thành viên';
      const snippet = content.trim().length > 40 ? `${content.trim().slice(0, 40)}...` : content.trim();
      notificationService.notify({
        user_id: targetPost.author_id,
        content: `${commenterName} đã bình luận vào bài viết của bạn: "${snippet}"`,
      }).catch(() => {});
    }

    return newComment;
  },

  /**
   * Lấy danh sách bình luận đang hoạt động của bài viết, hỗ trợ phân trang
   */
  async getCommentsByPost(postId, query = {}) {
    const numericPostId = Number(postId);
    if (isNaN(numericPostId)) {
      throw ApiError.badRequest('Invalid post ID format');
    }

    const post = await postRepository.findPostById(numericPostId);
    if (!post || post.status !== POST_STATUS.PUBLISHED || post.deleted_at) {
      throw ApiError.notFound('Post not found or has been deleted');
    }

    const where = {
      post_id: numericPostId,
      status: COMMENT_STATUS.ACTIVE,
    };

    const hasPagination = query.page !== undefined || query.limit !== undefined;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const include = {
      user: {
        select: {
          user_id: true,
          full_name: true,
        },
      },
    };

    const orderBy = {
      created_at: 'desc',
    };

    if (hasPagination) {
      const [total, comments] = await Promise.all([
        commentRepository.count({ where }),
        commentRepository.findMany({
          where,
          include,
          orderBy,
          skip,
          take: limit,
        }),
      ]);

      return {
        comments,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    return await commentRepository.findMany({
      where,
      include,
      orderBy,
    });
  },

  /**
   * Cập nhật nội dung bình luận (Chỉ tác giả bình luận mới có quyền sửa)
   */
  async updateComment(id, { content }, currentUser) {
    const commentId = Number(id);
    if (isNaN(commentId)) {
      throw ApiError.badRequest('Invalid comment ID format');
    }

    if (!content?.trim()) {
      throw ApiError.badRequest('Comment content cannot be empty');
    }

    return contentModerationRepository.transaction(async (tx) => {
      await commentRepository.lockForUpdate(commentId, tx);
      const comment = await commentRepository.findById(commentId, COMMENT_AUTHOR_INCLUDE, tx);
      if (!comment || comment.deleted_at || ![COMMENT_STATUS.ACTIVE, COMMENT_STATUS.PENDING_MODERATION].includes(comment.status)) {
        throw ApiError.notFound('Comment not found or inactive');
      }
      if (currentUser && comment.user_id !== currentUser.user_id) {
        throw ApiError.forbidden('Bạn chỉ có thể chỉnh sửa bình luận của chính mình');
      }
      if (comment.content === content.trim()) return comment;
      const updated = await commentRepository.update(commentId, { content: content.trim() }, COMMENT_AUTHOR_INCLUDE, tx);
      const moderation = await contentModerationService.queueComment({ comment: updated }, tx);
      return { ...updated, ...moderation };
    });
  },

  /**
   * Xóa mềm (Soft Delete) bình luận
   * Người viết bình luận HOẶC tác giả bài viết HOẶC Quản trị viên mới được xóa
   */
  async deleteComment(id, currentUser) {
    const commentId = Number(id);
    if (isNaN(commentId)) {
      throw ApiError.badRequest('Invalid comment ID format');
    }

    const comment = await commentRepository.findById(commentId, {
      post: {
        select: {
          author_id: true,
        },
      },
    });

    if (!comment) {
      throw ApiError.notFound('Comment not found');
    }

    if (currentUser) {
      const isCommentAuthor = comment.user_id === currentUser.user_id;
      const isPostAuthor = comment.post?.author_id === currentUser.user_id;
      const isAdmin = currentUser.role === ROLES.ADMIN;

      if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
        throw ApiError.forbidden('Bạn không có quyền xóa bình luận này');
      }
    }

    if (comment.status === COMMENT_STATUS.DELETED) {
      return { message: 'Comment is already deleted' };
    }

    await commentRepository.update(commentId, {
      status: COMMENT_STATUS.DELETED,
      deleted_at: new Date(),
    });

    return { message: 'Comment deleted successfully' };
  },
};
