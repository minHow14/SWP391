// d:\Projects\FPT\SWP391\server\src\routes\upload.route.js
import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { uploadAvatar, uploadPostImage, uploadPostMedia } from '../middlewares/upload.js';
import * as uploadController from '../controllers/upload.controller.js';

const router = express.Router();

// Bắt buộc người dùng phải đăng nhập trước khi upload file
router.use(authenticate);

router.post('/avatar', uploadAvatar, uploadController.uploadAvatarHandler);
router.post('/post-image', uploadPostImage, uploadController.uploadPostImageHandler);
router.post('/post-media', uploadPostMedia, uploadController.uploadPostMediaHandler);

export default router;
