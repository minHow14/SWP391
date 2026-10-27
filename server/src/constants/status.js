// d:\Projects\FPT\SWP391\server\src\constants\status.js
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
  HIDDEN: 'HIDDEN',
  DELETED: 'DELETED',
});

/**
 * Định nghĩa trạng thái bình luận (comments)
 */
export const COMMENT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
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

/**
 * Định nghĩa trạng thái phiên quét nguyên liệu qua ảnh
 */
export const SCAN_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
});

/**
 * Định nghĩa đánh giá độ tươi của nguyên liệu
 */
export const FRESHNESS_STATUS = Object.freeze({
  FRESH: 'FRESH',
  GOOD: 'GOOD',
  EXPIRING_SOON: 'EXPIRING_SOON',
  SPOILED: 'SPOILED',
});
