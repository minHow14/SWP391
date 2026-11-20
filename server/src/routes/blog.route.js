// D:/SWP391/SWP391/server/src/routes/blog.route.js
// Router bài viết blog (/api/v1/blogs): xem công khai, tạo/sửa/xóa cần đăng nhập.
import express from 'express';
import * as blogController from '../controllers/blog.controller.js';
import { authenticate, optionalAuthenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { schemas } from '../validators/index.js';

const router = express.Router();

// GET /blogs — [Công khai] Danh sách blog có phân trang/lọc.
router.get('/', blogController.getAllBlogs);
// GET /blogs/:id — [Công khai, token tùy chọn] Chi tiết blog; có token thì kèm trạng thái vote của người xem.
router.get('/:id', optionalAuthenticate, validate(schemas.idParams, 'params'), blogController.getBlogById);

// Các endpoint thay đổi dữ liệu yêu cầu xác thực JWT
// POST /blogs — [Đăng nhập] Tạo blog mới.
router.post('/', authenticate, validate(schemas.createBlog), blogController.createBlog);
// PUT /blogs/:id — [Đăng nhập, chủ bài viết] Cập nhật blog.
router.put('/:id', authenticate, validate(schemas.idParams, 'params'), validate(schemas.updateBlog), blogController.updateBlog);
// DELETE /blogs/:id — [Đăng nhập, chủ bài viết] Xóa blog.
router.delete('/:id', authenticate, validate(schemas.idParams, 'params'), blogController.deleteBlog);

export default router;
