// D:/SWP391/SWP391/server/src/services/moderationImageLoader.js
// Đọc ảnh bài viết đã upload từ đĩa để gửi sang AI kiểm duyệt nội dung.
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { POST_UPLOAD_DIRECTORY } from '../config/uploads.js';
import { MODERATION_IMAGE_UNREADABLE, MODERATION_MAX_IMAGE_BYTES } from '../constants/contentModeration.js';
import { POST_IMAGE_URL_PATTERN } from '../constants/postMedia.js';
import { detectImageMimeType } from '../utils/imageSignature.js';

// Tạo lỗi thống nhất cho mọi trường hợp ảnh không đọc được, để không lộ chi tiết đường dẫn/hệ thống tệp.
const unreadableImage = () => Object.assign(new Error('Moderation image is unreadable.'), { errorCode: MODERATION_IMAGE_UNREADABLE });

/** Chỉ đọc ảnh bài viết do server upload; regex URL loại bỏ path traversal trước khi chạm vào đĩa. */
export async function loadModerationImage(imageUrl, { directory = POST_UPLOAD_DIRECTORY } = {}) {
  if (!POST_IMAGE_URL_PATTERN.test(imageUrl)) throw unreadableImage();
  // Chỉ lấy basename để chắc chắn tệp nằm trong thư mục upload, dù URL có ký tự lạ.
  const filePath = path.join(directory, path.basename(imageUrl));
  try {
    const { size } = await stat(filePath);
    // Chặn ảnh quá lớn trước khi đọc vào bộ nhớ và mã hóa base64.
    if (size > MODERATION_MAX_IMAGE_BYTES) throw unreadableImage();
    const buffer = await readFile(filePath);
    // Xác định MIME bằng chữ ký byte thật của tệp, không tin vào phần mở rộng.
    const mimeType = detectImageMimeType(buffer);
    if (!mimeType) throw unreadableImage();
    return { mimeType, imageBase64: buffer.toString('base64') };
  } catch (error) {
    // Lỗi đã có errorCode thì giữ nguyên; lỗi hệ thống tệp (ENOENT...) quy về "ảnh không đọc được".
    if (error.errorCode) throw error;
    throw unreadableImage();
  }
}
