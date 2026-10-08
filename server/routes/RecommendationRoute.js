// JavaScript source code
import express from 'express';
import { suggestByKeyword } from '../controllers/RecommendationController.js';

const router = express.Router();
router.get('/suggest', suggestByKeyword);

export default router;