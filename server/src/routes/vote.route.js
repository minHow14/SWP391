import express from 'express';
import * as voteController from '../controllers/vote.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/post/:postId', voteController.getPostVoteSummary);

// Các endpoint vote yêu cầu đăng nhập
router.post('/', authenticate, voteController.castOrUpdateVote);
router.delete('/', authenticate, voteController.removeVote); // Hỗ trợ body cũ
router.delete('/post/:postId', authenticate, voteController.removeVote); // Chuẩn RESTful mới

export default router;
