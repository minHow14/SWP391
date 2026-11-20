// D:/SWP391/SWP391/server/src/config/uploads.js
// Đường dẫn tuyệt đối tới thư mục lưu file tải lên (server/uploads) và thư mục con cho bài đăng.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const UPLOAD_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
export const POST_UPLOAD_DIRECTORY = path.join(UPLOAD_ROOT, 'posts');
