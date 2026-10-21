// d:\Projects\FPT\SWP391\server\src\repositories\vote.repository.js
import prisma from '../config/prisma.js';

export const voteRepository = {
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

  async countVotes(postId, voteType, db = prisma) {
    return db.postVote.count({
      where: {
        post_id: Number(postId),
        vote_type: voteType,
      },
    });
  },
};
