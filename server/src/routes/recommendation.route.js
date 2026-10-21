// d:\Projects\FPT\SWP391\server\src\routes\recommendation.route.js
import express from 'express';
import { suggestByKeyword } from '../controllers/search.controller.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { schemas } from '../validators/index.js';

const router = express.Router();

router.get('/suggest', validate(schemas.recommendation, 'query'), suggestByKeyword);

export default router;
