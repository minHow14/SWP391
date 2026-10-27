// d:\Projects\FPT\SWP391\server\src\services\purge.service.js
import prisma from '../config/prisma.js';
import {
  userRepository,
  postRepository,
  commentRepository,
} from '../repositories/index.js';

export const RETENTION_DAYS = 30;

/**
 * Tính mốc thời gian hết hạn lưu trữ (mặc định 30 ngày trước)
 * @param {number} days
 * @returns {Date}
 */
export const calculatePurgeThreshold = (days = RETENTION_DAYS) => {
  return new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
};

/**
 * Thống kê các bản ghi xóa mềm đang trong thời gian chờ 30 ngày hoặc đã quá hạn
 */
export const getRetentionStats = async ({ retentionDays = RETENTION_DAYS } = {}) => {
  const threshold = calculatePurgeThreshold(retentionDays);

  const [
    totalDeletedUsers,
    expiredUsers,
    totalDeletedPosts,
    expiredPosts,
    totalDeletedComments,
    expiredComments,
    pendingUsersList,
  ] = await Promise.all([
    userRepository.countDeleted(),
    userRepository.countExpiredDeleted(threshold),
    postRepository.countDeleted(),
    postRepository.countExpiredDeleted(threshold),
    commentRepository.countDeleted(),
    commentRepository.countExpiredDeleted(threshold),
    userRepository.findPendingPurgeUsers(10),
  ]);

  const items = pendingUsersList.map((u) => {
    const deletedTime = u.deleted_at ? new Date(u.deleted_at).getTime() : Date.now();
    const purgeTime = deletedTime + Number(retentionDays) * 24 * 60 * 60 * 1000;
    const msRemaining = Math.max(0, purgeTime - Date.now());
    const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));

    return {
      userId: u.user_id,
      fullName: u.full_name,
      email: u.email,
      deletedAt: u.deleted_at,
      purgeAt: new Date(purgeTime).toISOString(),
      daysRemaining,
      isExpired: daysRemaining === 0,
    };
  });

  return {
    retentionDays: Number(retentionDays),
    thresholdDate: threshold.toISOString(),
    users: {
      totalDeleted: totalDeletedUsers,
      expired: expiredUsers,
      pendingPurge: totalDeletedUsers - expiredUsers,
    },
    posts: {
      totalDeleted: totalDeletedPosts,
      expired: expiredPosts,
      pendingPurge: totalDeletedPosts - expiredPosts,
    },
    comments: {
      totalDeleted: totalDeletedComments,
      expired: expiredComments,
      pendingPurge: totalDeletedComments - expiredComments,
    },
    upcomingPurgeUsers: items,
  };
};

/**
 * Thực thi xóa cứng vĩnh viễn (Hard Delete) các bản ghi đã xóa mềm quá hạn 30 ngày
 */
export const purgeExpiredDeletedItems = async ({ retentionDays = RETENTION_DAYS } = {}) => {
  const threshold = calculatePurgeThreshold(retentionDays);

  return prisma.$transaction(async (tx) => {
    // 1. Tìm và xóa cứng bình luận hết hạn qua repository
    const expiredComments = await commentRepository.findExpiredDeletedCommentIds(threshold, tx);
    const commentIds = expiredComments.map((c) => c.comment_id);
    let purgedCommentsCount = 0;
    if (commentIds.length > 0) {
      const res = await commentRepository.deleteCommentsByIds(commentIds, tx);
      purgedCommentsCount = res.count;
    }

    // 2. Tìm và xóa cứng bài viết hết hạn (Post + Blog + Video) qua repository
    const expiredPosts = await postRepository.findExpiredDeletedPostIds(threshold, tx);
    const postIds = expiredPosts.map((p) => p.post_id);
    let purgedPostsCount = 0;
    if (postIds.length > 0) {
      // Trước khi xóa post, gỡ liên kết post_id ở Recipe để không vi phạm ràng buộc
      await postRepository.unlinkRecipesByPostIds(postIds, tx);
      const res = await postRepository.deletePostsByIds(postIds, tx);
      purgedPostsCount = res.count;
    }

    // 3. Tìm và xóa cứng người dùng hết hạn (User) qua repository
    const expiredUsers = await userRepository.findExpiredDeletedUserIds(threshold, tx);
    const userIds = expiredUsers.map((u) => u.user_id);
    let purgedUsersCount = 0;
    if (userIds.length > 0) {
      const res = await userRepository.deleteUsersByIds(userIds, tx);
      purgedUsersCount = res.count;
    }

    return {
      success: true,
      retentionDays: Number(retentionDays),
      thresholdDate: threshold.toISOString(),
      purged: {
        comments: purgedCommentsCount,
        posts: purgedPostsCount,
        users: purgedUsersCount,
        total: purgedCommentsCount + purgedPostsCount + purgedUsersCount,
      },
      executedAt: new Date().toISOString(),
    };
  });
};

/**
 * Khởi chạy tác vụ nền tự động dọn rác định kỳ (chạy mỗi 24 giờ)
 */
export const startAutoPurgeCron = ({ intervalHours = 24, retentionDays = RETENTION_DAYS } = {}) => {
  const intervalMs = Number(intervalHours) * 60 * 60 * 1000;

  // Thực thi lần đầu sau 10 giây khi server khởi động
  setTimeout(() => {
    purgeExpiredDeletedItems({ retentionDays })
      .then((res) => {
        if (res.purged.total > 0) {
          console.log(`[AutoPurge] Đã tự động xóa cứng ${res.purged.total} bản ghi quá hạn ${retentionDays} ngày.`);
        }
      })
      .catch((err) => {
        console.error('[AutoPurge] Lỗi trong tác vụ quét dọn rác:', err.message);
      });
  }, 10000);

  // Lặp lại mỗi 24 giờ
  return setInterval(() => {
    purgeExpiredDeletedItems({ retentionDays })
      .then((res) => {
        if (res.purged.total > 0) {
          console.log(`[AutoPurge] Đã tự động xóa cứng ${res.purged.total} bản ghi quá hạn ${retentionDays} ngày.`);
        }
      })
      .catch((err) => {
        console.error('[AutoPurge] Lỗi trong tác vụ quét định kỳ:', err.message);
      });
  }, intervalMs);
};
