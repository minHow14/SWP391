// d:\Projects\FPT\SWP391\server\src\routes\search.route.js
// Router tìm kiếm toàn cục (/api/v1/search) trên video và blog.
import express from 'express';
import { globalSearch } from '../controllers/search.controller.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { schemas } from '../validators/index.js';

const router = express.Router();

// GET /search — [Công khai] Tìm kiếm video/blog theo từ khóa, có lọc và phân trang.
router.get('/', validate(schemas.search, 'query'), globalSearch);

export default router;
