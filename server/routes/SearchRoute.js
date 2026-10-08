// JavaScript source code
import express from 'express';
import { globalSearch } from '../controllers/SearchController.js';

const router = express.Router();
router.get('/', globalSearch);

export default router;