import express from 'express';
import * as voteController from '../controllers/vote.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { schemas } from '../validators.js';

const router = express.Router();

router.get('/post/:postId', validate(schemas.postIdParams, 'params'), voteController.getPostVoteSummary);

// Các endpoint vote yêu cầu đăng nhập
router.post('/', authenticate, validate(schemas.vote), voteController.castOrUpdateVote);
router.delete('/', authenticate, voteController.removeVote); // Hỗ trợ body cũ
router.delete('/post/:postId', authenticate, validate(schemas.postIdParams, 'params'), voteController.removeVote); // Chuẩn RESTful mới

export default router;
