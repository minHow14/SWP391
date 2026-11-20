// D:/SWP391/SWP391/server/src/constants/postMedia.js
// Quy tắc hợp lệ cho media đính kèm bài đăng và ảnh bìa video, kèm thông báo lỗi hiển thị cho người dùng.
// Media của bài đăng phải là file do /upload/post-media tạo ra; liên kết ngoài bị từ chối để mọi ảnh đều được kiểm duyệt.
export const POST_MEDIA_URL_PATTERN = /^\/uploads\/posts\/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp|gif|mp4|webm|ogg)$/i;
export const POST_IMAGE_URL_PATTERN = /^\/uploads\/posts\/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp|gif)$/i;
// Chỉ chấp nhận ảnh bìa từ các host ảnh chính thức của YouTube.
export const YOUTUBE_THUMBNAIL_HOSTS = Object.freeze(['img.youtube.com', 'i.ytimg.com']);
export const POST_MEDIA_URL_MESSAGE = 'Tệp đính kèm phải được tải lên qua hệ thống, không chấp nhận liên kết ngoài.';
export const VIDEO_URL_MESSAGE = 'Chỉ chấp nhận liên kết video YouTube HTTPS hợp lệ, không kèm playlist.';
export const VIDEO_THUMBNAIL_MESSAGE = 'Ảnh bìa phải được tải lên qua hệ thống hoặc lấy từ YouTube.';
