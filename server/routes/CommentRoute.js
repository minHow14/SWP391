// JavaScript source code
import express from 'express';
import * as controller from '../controllers/CommentController.js';

const router = express.Router();
router.post('/', controller.createComment);
router.get('/post/:postId', controller.getCommentsByPost);
router.put('/:id', controller.updateComment);
router.delete('/:id', controller.deleteComment);

export default router;