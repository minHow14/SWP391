// d:\Projects\FPT\SWP391\server\src\middlewares\upload.js
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ApiError } from '../utils/apiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

// Đảm bảo các thư mục upload tồn tại sẵn
const subDirs = ['avatars', 'posts', 'temp', 'recognition'];
for (const dir of subDirs) {
  const dirPath = path.join(UPLOAD_ROOT, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Các định dạng ảnh được phép tải lên
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

// Các định dạng ảnh & video hỗ trợ cho bài đăng cộng đồng
const ALLOWED_MEDIA_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/ogg',
]);
const ALLOWED_MEDIA_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.mp4',
  '.webm',
  '.ogg',
]);
const MAX_MEDIA_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_RECOGNITION_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Cấu hình nơi lưu và sinh tên file UUID
 * @param {string} subFolder - Tên thư mục con (avatars, posts, temp, recognition)
 */
const createStorage = (subFolder = 'temp') => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const targetDir = path.join(UPLOAD_ROOT, subFolder);
      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uuid = randomUUID();
      cb(null, `${uuid}${ext}`);
    },
  });
};

/**
 * Bộ lọc kiểm tra tính hợp lệ của MIME type và đuôi mở rộng cho ảnh
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    return cb(
      ApiError.badRequest(
        'Định dạng tệp không được hỗ trợ. Chỉ chấp nhận các định dạng ảnh: JPG, PNG, WEBP.'
      )
    );
  }
  cb(null, true);
};

/**
 * Bộ lọc kiểm tra tính hợp lệ cho tệp đa phương tiện bài đăng (ảnh và video)
 */
const mediaFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MEDIA_MIME_TYPES.has(file.mimetype) || !ALLOWED_MEDIA_EXTENSIONS.has(ext)) {
    return cb(
      ApiError.badRequest(
        'Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh (JPG, PNG, WEBP, GIF) hoặc video (MP4, WEBM, OGG).'
      )
    );
  }
  cb(null, true);
};

// Cấu hình Multer cho từng mục đích
export const uploadAvatar = multer({
  storage: createStorage('avatars'),
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
}).single('avatar');

export const uploadPostImage = multer({
  storage: createStorage('posts'),
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
}).single('image');

export const uploadGeneralImage = multer({
  storage: createStorage('temp'),
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
}).single('file');

export const uploadMultiplePostImages = multer({
  storage: createStorage('posts'),
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE, files: 5 },
}).array('images', 5);

export const uploadPostMedia = multer({
  storage: createStorage('posts'),
  fileFilter: mediaFileFilter,
  limits: { fileSize: MAX_MEDIA_FILE_SIZE, files: 6 },
}).array('files', 6);

export const uploadRecognitionImage = multer({
  storage: createStorage('recognition'),
  fileFilter,
  limits: { fileSize: MAX_RECOGNITION_IMAGE_SIZE, files: 1 },
}).single('image');
