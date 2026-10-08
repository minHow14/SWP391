// JavaScript source code
import express from 'express';
import * as controller from '../controllers/VoteController.js';

const router = express.Router();
router.post('/', controller.castOrUpdateVote);
router.delete('/', controller.removeVote);
router.get('/post/:postId', controller.getPostVoteSummary);

export default router;