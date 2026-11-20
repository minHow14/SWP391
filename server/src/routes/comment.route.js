// d:\Projects\FPT\SWP391\server\src\routes\comment.route.js
// Router bình luận (/api/v1/comments) cho bài viết/video.
import express from 'express';
import * as commentController from '../controllers/comment.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { schemas } from '../validators/index.js';

const router = express.Router();

// GET /comments/post/:postId — [Công khai] Danh sách bình luận của một bài viết.
router.get('/post/:postId', validate(schemas.postIdParams, 'params'), commentController.getCommentsByPost);

// Các endpoint thay đổi bình luận yêu cầu xác thực JWT
// POST /comments — [Đăng nhập] Thêm bình luận (hoặc trả lời bình luận).
router.post('/', authenticate, validate(schemas.createComment), commentController.createComment);
// PUT /comments/:id — [Đăng nhập, chủ bình luận] Sửa bình luận.
router.put('/:id', authenticate, validate(schemas.idParams, 'params'), validate(schemas.updateComment), commentController.updateComment);
// DELETE /comments/:id — [Đăng nhập, chủ bình luận] Xóa bình luận.
router.delete('/:id', authenticate, validate(schemas.idParams, 'params'), commentController.deleteComment);

export default router;
