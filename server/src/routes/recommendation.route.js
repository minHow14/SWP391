import express from 'express';
import { suggestByKeyword } from '../controllers/recommendation.controller.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { schemas } from '../validators.js';

const router = express.Router();

router.get('/suggest', validate(schemas.recommendation, 'query'), suggestByKeyword);

export default router;

