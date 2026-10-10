import express from 'express';
import * as videoController from '../controllers/video.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', videoController.getAllVideos);
router.get('/:id', videoController.getVideoById);

// Các endpoint thay đổi dữ liệu yêu cầu xác thực JWT
router.post('/', authenticate, videoController.createVideo);
router.put('/:id', authenticate, videoController.updateVideo);
router.delete('/:id', authenticate, videoController.deleteVideo);

export default router;
