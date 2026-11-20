// d:\Projects\FPT\SWP391\server\src\routes\recommendation.route.js
// Router gợi ý nội dung theo từ khóa (/api/v1/recommendations).
import express from 'express';
import { suggestByKeyword } from '../controllers/search.controller.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { schemas } from '../validators/index.js';

const router = express.Router();

// GET /recommendations/suggest — [Công khai] Gợi ý bài viết/video theo từ khóa.
router.get('/suggest', validate(schemas.recommendation, 'query'), suggestByKeyword);

export default router;
