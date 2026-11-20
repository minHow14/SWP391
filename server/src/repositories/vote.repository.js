// d:\Projects\FPT\SWP391\server\src\repositories\vote.repository.js
// Repository truy cập bảng bình chọn (upvote/downvote) bài viết; mỗi người dùng chỉ có một phiếu cho mỗi bài.
import prisma from '../config/prisma.js';

export const voteRepository = {
  // Tìm phiếu của người dùng cho bài viết.
  async findVote(userId, postId, db = prisma) {
    return db.postVote.findUnique({
      where: {
        user_id_post_id: {
          user_id: Number(userId),
          post_id: Number(postId),
        },
      },
    });
  },

  // Tạo phiếu mới hoặc đổi loại phiếu nếu đã bình chọn (dựa trên khóa duy nhất user_id + post_id).
  async upsertVote(userId, postId, voteType, db = prisma) {
    const numericUserId = Number(userId);
    const numericPostId = Number(postId);
    return db.postVote.upsert({
      where: {
        user_id_post_id: {
          user_id: numericUserId,
          post_id: numericPostId,
        },
      },
      update: {
        vote_type: voteType,
      },
      create: {
        user_id: numericUserId,
        post_id: numericPostId,
        vote_type: voteType,
      },
    });
  },

  // Xóa phiếu (bỏ bình chọn).
  async deleteVote(userId, postId, db = prisma) {
    return db.postVote.delete({
      where: {
        user_id_post_id: {
          user_id: Number(userId),
          post_id: Number(postId),
        },
      },
    });
  },

  // Đếm số phiếu theo loại của một bài viết.
  async countVotes(postId, voteType, db = prisma) {
    return db.postVote.count({
      where: {
        post_id: Number(postId),
        vote_type: voteType,
      },
    });
  },
};
