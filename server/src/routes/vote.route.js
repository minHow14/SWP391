// d:\Projects\FPT\SWP391\server\src\routes\vote.route.js
// Router bình chọn (upvote/downvote) bài viết (/api/v1/votes).
import express from 'express';
import * as voteController from '../controllers/vote.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { schemas } from '../validators/index.js';

const router = express.Router();

// GET /votes/post/:postId — [Công khai] Tổng hợp số vote của bài viết.
router.get('/post/:postId', validate(schemas.postIdParams, 'params'), voteController.getPostVoteSummary);

// Các endpoint vote yêu cầu đăng nhập
// POST /votes — [Đăng nhập] Bình chọn mới hoặc đổi chiều bình chọn.
router.post('/', authenticate, validate(schemas.vote), voteController.castOrUpdateVote);
// DELETE /votes — [Đăng nhập] Hủy vote, postId gửi trong body (cách cũ).
router.delete('/', authenticate, voteController.removeVote); // Hỗ trợ body cũ
// DELETE /votes/post/:postId — [Đăng nhập] Hủy vote theo postId trên URL.
router.delete('/post/:postId', authenticate, validate(schemas.postIdParams, 'params'), voteController.removeVote); // Chuẩn RESTful mới

export default router;
