// d:\Projects\FPT\SWP391\server\src\services\purge.service.js
import prisma from '../config/prisma.js';

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
    prisma.user.count({ where: { status: 'DELETED' } }),
    prisma.user.count({ where: { status: 'DELETED', deleted_at: { lte: threshold } } }),
    prisma.post.count({ where: { status: 'DELETED' } }),
    prisma.post.count({ where: { status: 'DELETED', deleted_at: { lte: threshold } } }),
    prisma.comment.count({ where: { status: 'DELETED' } }),
    prisma.comment.count({ where: { status: 'DELETED', deleted_at: { lte: threshold } } }),
    prisma.user.findMany({
      where: { status: 'DELETED' },
      select: { user_id: true, full_name: true, email: true, deleted_at: true },
      take: 10,
      orderBy: { deleted_at: 'asc' },
    }),
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
    // 1. Tìm và xóa cứng bình luận hết hạn
    const expiredComments = await tx.comment.findMany({
      where: { status: 'DELETED', deleted_at: { lte: threshold } },
      select: { comment_id: true },
    });
    const commentIds = expiredComments.map((c) => c.comment_id);
    let purgedCommentsCount = 0;
    if (commentIds.length > 0) {
      const res = await tx.comment.deleteMany({
        where: { comment_id: { in: commentIds } },
      });
      purgedCommentsCount = res.count;
    }

    // 2. Tìm và xóa cứng bài viết hết hạn (Post + Blog + Video)
    const expiredPosts = await tx.post.findMany({
      where: { status: 'DELETED', deleted_at: { lte: threshold } },
      select: { post_id: true },
    });
    const postIds = expiredPosts.map((p) => p.post_id);
    let purgedPostsCount = 0;
    if (postIds.length > 0) {
      // Trước khi xóa post, gỡ liên kết post_id ở Recipe để không vi phạm ràng buộc
      await tx.recipe.updateMany({
        where: { post_id: { in: postIds } },
        data: { post_id: null },
      });

      const res = await tx.post.deleteMany({
        where: { post_id: { in: postIds } },
      });
      purgedPostsCount = res.count;
    }

    // 3. Tìm và xóa cứng người dùng hết hạn (User)
    const expiredUsers = await tx.user.findMany({
      where: { status: 'DELETED', deleted_at: { lte: threshold } },
      select: { user_id: true },
    });
    const userIds = expiredUsers.map((u) => u.user_id);
    let purgedUsersCount = 0;
    if (userIds.length > 0) {
      const res = await tx.user.deleteMany({
        where: { user_id: { in: userIds } },
      });
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
