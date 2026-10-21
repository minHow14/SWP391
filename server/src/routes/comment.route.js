// d:\Projects\FPT\SWP391\server\src\routes\comment.route.js
import express from 'express';
import * as commentController from '../controllers/comment.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { schemas } from '../validators/index.js';

const router = express.Router();

router.get('/post/:postId', validate(schemas.postIdParams, 'params'), commentController.getCommentsByPost);

// Các endpoint thay đổi bình luận yêu cầu xác thực JWT
router.post('/', authenticate, validate(schemas.createComment), commentController.createComment);
router.put('/:id', authenticate, validate(schemas.idParams, 'params'), validate(schemas.updateComment), commentController.updateComment);
router.delete('/:id', authenticate, validate(schemas.idParams, 'params'), commentController.deleteComment);

export default router;
