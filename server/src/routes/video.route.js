// d:\Projects\FPT\SWP391\server\src\routes\video.route.js
// Router video công thức (/api/v1/videos): xem công khai, tạo/sửa/xóa cần đăng nhập.
import express from 'express';
import * as videoController from '../controllers/video.controller.js';
import { authenticate, optionalAuthenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { schemas } from '../validators/index.js';

const router = express.Router();

// GET /videos — [Công khai] Danh sách video có phân trang/lọc.
router.get('/', videoController.getAllVideos);
// GET /videos/:id — [Công khai, token tùy chọn] Chi tiết video; có token thì kèm trạng thái vote của người xem.
router.get('/:id', optionalAuthenticate, validate(schemas.idParams, 'params'), videoController.getVideoById);

// Các endpoint thay đổi dữ liệu yêu cầu xác thực JWT
// POST /videos — [Đăng nhập] Đăng video mới.
router.post('/', authenticate, validate(schemas.createVideo), videoController.createVideo);
// PUT /videos/:id — [Đăng nhập, chủ video] Cập nhật video.
router.put('/:id', authenticate, validate(schemas.idParams, 'params'), validate(schemas.updateVideo), videoController.updateVideo);
// DELETE /videos/:id — [Đăng nhập, chủ video] Xóa video.
router.delete('/:id', authenticate, validate(schemas.idParams, 'params'), videoController.deleteVideo);

export default router;
