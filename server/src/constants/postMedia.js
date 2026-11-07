// D:/SWP391/SWP391/server/src/constants/postMedia.js
// Post media must be a file produced by /upload/post-media; outside links are refused so every image can be moderated.
export const POST_MEDIA_URL_PATTERN = /^\/uploads\/posts\/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp|gif|mp4|webm|ogg)$/i;
export const POST_IMAGE_URL_PATTERN = /^\/uploads\/posts\/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp|gif)$/i;
export const YOUTUBE_THUMBNAIL_HOSTS = Object.freeze(['img.youtube.com', 'i.ytimg.com']);
export const POST_MEDIA_URL_MESSAGE = 'Tệp đính kèm phải được tải lên qua hệ thống, không chấp nhận liên kết ngoài.';
export const VIDEO_URL_MESSAGE = 'Chỉ chấp nhận liên kết video YouTube HTTPS hợp lệ, không kèm playlist.';
export const VIDEO_THUMBNAIL_MESSAGE = 'Ảnh bìa phải được tải lên qua hệ thống hoặc lấy từ YouTube.';
