// d:\Projects\FPT\SWP391\server\src\routes\video.route.js
import express from 'express';
import * as videoController from '../controllers/video.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { schemas } from '../validators/index.js';

const router = express.Router();

router.get('/', videoController.getAllVideos);
router.get('/:id', validate(schemas.idParams, 'params'), videoController.getVideoById);

// Các endpoint thay đổi dữ liệu yêu cầu xác thực JWT
router.post('/', authenticate, validate(schemas.createVideo), videoController.createVideo);
router.put('/:id', authenticate, validate(schemas.idParams, 'params'), validate(schemas.updateVideo), videoController.updateVideo);
router.delete('/:id', authenticate, validate(schemas.idParams, 'params'), videoController.deleteVideo);

export default router;
