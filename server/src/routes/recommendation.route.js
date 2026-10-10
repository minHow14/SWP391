import express from 'express';
import { suggestByKeyword } from '../controllers/recommendation.controller.js';

const router = express.Router();

router.get('/suggest', suggestByKeyword);

export default router;

