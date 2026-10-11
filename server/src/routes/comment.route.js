import express from 'express';
import * as commentController from '../controllers/comment.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/post/:postId', commentController.getCommentsByPost);

// Các endpoint thay đổi bình luận yêu cầu xác thực JWT
router.post('/', authenticate, commentController.createComment);
router.put('/:id', authenticate, commentController.updateComment);
router.delete('/:id', authenticate, commentController.deleteComment);

export default router;
