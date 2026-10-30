// D:/SWP391/SWP391/server/src/constants/status.js
/**
 * Định nghĩa trạng thái tài khoản người dùng
 */
export const USER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  LOCKED: 'LOCKED',
  DELETED: 'DELETED',
});

/**
 * Định nghĩa trạng thái bài đăng (posts)
 */
export const POST_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  PUBLISHED: 'PUBLISHED',
  PENDING_MODERATION: 'PENDING_MODERATION',
  HIDDEN_BY_AI: 'HIDDEN_BY_AI',
  HIDDEN: 'HIDDEN',
  DELETED: 'DELETED',
});

/**
 * Định nghĩa trạng thái bình luận (comments)
 */
export const COMMENT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  PENDING_MODERATION: 'PENDING_MODERATION',
  HIDDEN_BY_AI: 'HIDDEN_BY_AI',
  HIDDEN: 'HIDDEN',
  DELETED: 'DELETED',
});

/**
 * Định nghĩa trạng thái báo cáo vi phạm (reports)
 */
export const REPORT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
});
