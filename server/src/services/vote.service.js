// D:/SWP391/SWP391/server/src/services/vote.service.js
import { voteRepository } from '../repositories/vote.repository.js';
import { postRepository } from '../repositories/post.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { POST_STATUS, VOTE_TYPE } from '../constants/index.js';
import { ApiError } from '../utils/index.js';

export const voteService = {
  /**
   * Tạo mới hoặc cập nhật Vote của người dùng cho bài viết sử dụng UPSERT
   */
  async castOrUpdateVote({ user_id, post_id, vote_type }) {
    const numericUserId = Number(user_id);
    const numericPostId = Number(post_id);

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
    const post = await postRepository.findPostById(numericPostId);
    if (!post || post.status !== POST_STATUS.PUBLISHED || post.deleted_at) {
      throw ApiError.notFound('Post not found or has been deleted');
    }

    // Kiểm tra user có tồn tại không
    const user = await userRepository.findById(numericUserId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Kiểm tra xem đã vote từ trước chưa
    const existingVote = await voteRepository.findVote(numericUserId, numericPostId);
    const isNew = !existingVote;

    // Sử dụng upsert nguyên tử trên khóa chính kết hợp (user_id, post_id)
    const vote = await voteRepository.upsertVote(numericUserId, numericPostId, vote_type);

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

    const existingVote = await voteRepository.findVote(numericUserId, numericPostId);
    if (!existingVote) {
      throw ApiError.notFound('Vote not found');
    }

    await voteRepository.deleteVote(numericUserId, numericPostId);

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

    const post = await postRepository.findPostById(numericPostId);
    if (!post || post.status !== POST_STATUS.PUBLISHED || post.deleted_at) {
      throw ApiError.notFound('Post not found or has been deleted');
    }

    const [upvotes, downvotes] = await Promise.all([
      voteRepository.countVotes(numericPostId, VOTE_TYPE.UPVOTE),
      voteRepository.countVotes(numericPostId, VOTE_TYPE.DOWNVOTE),
    ]);

    return {
      post_id: numericPostId,
      upvotes,
      downvotes,
      score: upvotes - downvotes,
    };
  },
};
