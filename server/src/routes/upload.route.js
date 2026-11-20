// d:\Projects\FPT\SWP391\server\src\routes\upload.route.js
// Router tải file lên (/api/v1/upload): ảnh đại diện, ảnh và media cho bài viết.
import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { uploadAvatar, uploadPostImage, uploadPostMedia } from '../middlewares/upload.js';
import * as uploadController from '../controllers/upload.controller.js';

const router = express.Router();

// Bắt buộc người dùng phải đăng nhập trước khi upload file
router.use(authenticate);

// POST /upload/avatar — [Đăng nhập] Tải ảnh đại diện.
router.post('/avatar', uploadAvatar, uploadController.uploadAvatarHandler);
// POST /upload/post-image — [Đăng nhập] Tải ảnh dùng trong bài viết.
router.post('/post-image', uploadPostImage, uploadController.uploadPostImageHandler);
// POST /upload/post-media — [Đăng nhập] Tải media (ảnh/video) đính kèm bài viết.
router.post('/post-media', uploadPostMedia, uploadController.uploadPostMediaHandler);

export default router;
