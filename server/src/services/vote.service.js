import prisma from '../config/prisma.js';
import { POST_STATUS, VOTE_TYPE } from '../constants/index.js';
import { ApiError } from '../utils/index.js';

export const voteService = {
  /**
   * Tạo mới hoặc cập nhật Vote của người dùng cho bài viết sử dụng UPSERT
   */
  async castOrUpdateVote({ user_id, post_id, vote_type }) {
    const numericUserId = Number(user_id);
    const numericPostId = Number(post_id);

    // SỬA LỖI BUG-002: Ép kiểu và kiểm tra chặt chẽ
    if (
      !numericUserId ||
      !numericPostId ||
      ![VOTE_TYPE.UPVOTE, VOTE_TYPE.DOWNVOTE].includes(vote_type)
    ) {
      throw ApiError.badRequest(
        'Valid user_id, post_id, and vote_type (UPVOTE|DOWNVOTE) are required'
      );
    }

    // Kiểm tra bài viết tồn tại và không bị xóa
    const post = await prisma.post.findUnique({
      where: { post_id: numericPostId },
    });
    if (!post || post.status === POST_STATUS.DELETED) {
      throw ApiError.notFound('Post not found or has been deleted');
    }

    // Kiểm tra user có tồn tại không
    const user = await prisma.user.findUnique({
      where: { user_id: numericUserId },
    });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Kiểm tra xem đã vote từ trước chưa
    const existingVote = await prisma.postVote.findUnique({
      where: {
        user_id_post_id: {
          user_id: numericUserId,
          post_id: numericPostId,
        },
      },
    });

    const isNew = !existingVote;

    // Sử dụng upsert nguyên tử trên khóa chính kết hợp (user_id, post_id)
    const vote = await prisma.postVote.upsert({
      where: {
        user_id_post_id: {
          user_id: numericUserId,
          post_id: numericPostId,
        },
      },
      update: {
        vote_type,
      },
      create: {
        user_id: numericUserId,
        post_id: numericPostId,
        vote_type,
      },
    });

    return {
      isNew,
      message: isNew ? 'Vote cast successfully' : 'Vote updated',
      vote,
    };
  },

  /**
   * Hủy Vote
   */
  async removeVote({ user_id, post_id }) {
    const numericUserId = Number(user_id);
    const numericPostId = Number(post_id);

    if (!numericUserId || !numericPostId) {
      throw ApiError.badRequest('Valid user_id and post_id are required');
    }

    const existingVote = await prisma.postVote.findUnique({
      where: {
        user_id_post_id: {
          user_id: numericUserId,
          post_id: numericPostId,
        },
      },
    });

    if (!existingVote) {
      throw ApiError.notFound('Vote not found');
    }

    await prisma.postVote.delete({
      where: {
        user_id_post_id: {
          user_id: numericUserId,
          post_id: numericPostId,
        },
      },
    });

    return { message: 'Vote removed successfully' };
  },

  /**
   * Lấy tổng hợp điểm vote của bài viết
   */
  async getPostVoteSummary(postId) {
    const numericPostId = Number(postId);
    if (isNaN(numericPostId)) {
      throw ApiError.badRequest('Invalid post ID format');
    }

    // SỬA LỖI BUG-007: Kiểm tra bài viết tồn tại trước khi tính toán
    const post = await prisma.post.findUnique({
      where: { post_id: numericPostId },
    });
    if (!post || post.status === POST_STATUS.DELETED) {
      throw ApiError.notFound('Post not found or has been deleted');
    }

    const [upvotes, downvotes] = await Promise.all([
      prisma.postVote.count({
        where: {
          post_id: numericPostId,
          vote_type: VOTE_TYPE.UPVOTE,
        },
      }),
      prisma.postVote.count({
        where: {
          post_id: numericPostId,
          vote_type: VOTE_TYPE.DOWNVOTE,
        },
      }),
    ]);

    return {
      post_id: numericPostId,
      upvotes,
      downvotes,
      score: upvotes - downvotes,
    };
  },
};
