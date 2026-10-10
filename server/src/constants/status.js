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
  HIDDEN_BY_AI: 'HIDDEN_BY_AI',
  DELETED: 'DELETED',
});

/**
 * Định nghĩa trạng thái bình luận (comments)
 */
export const COMMENT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  HIDDEN_BY_AI: 'HIDDEN_BY_AI',
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
