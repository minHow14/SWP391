// D:/SWP391/SWP391/server/src/constants/contentModeration.js
// Hằng số cho luồng kiểm duyệt nội dung bằng AI: trạng thái, endpoint AI Service, giới hạn ảnh và thông số worker.
export const MODERATION_PENDING_STATUS = 'PENDING_MODERATION';
// Endpoint của AI Service để kiểm duyệt văn bản và ảnh.
export const MODERATION_AI_PATH = '/api/v1/content-moderations';
export const MODERATION_IMAGE_AI_PATH = '/api/v1/image-moderations';
// Sáu tệp đính kèm của bài đăng cộng thêm một ảnh bìa video đã tải lên.
export const MODERATION_MAX_IMAGES = 7;
// Giới hạn kích thước mỗi ảnh và phản hồi AI để tránh tiêu tốn bộ nhớ.
export const MODERATION_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MODERATION_IMAGE_UNREADABLE = 'MODERATION_IMAGE_UNREADABLE';
export const MODERATION_MAX_RESPONSE_BYTES = 32_768;
// Thời gian lease dư thêm ngoài timeout, chu kỳ poll hàng đợi và độ trễ trước khi thử lại job lỗi.
export const MODERATION_LEASE_GRACE_MS = 30_000;
export const MODERATION_POLL_MS = 2_000;
export const MODERATION_RETRY_MS = 30_000;
// Giá trị dùng để nhả lease khi job kết thúc.
export const MODERATION_RELEASED_LEASE = Object.freeze({ leaseToken: null, leaseExpiresAt: null });
