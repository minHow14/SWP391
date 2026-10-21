// d:\Projects\FPT\SWP391\server\src\routes\search.route.js
import express from 'express';
import { globalSearch } from '../controllers/search.controller.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { schemas } from '../validators/index.js';

const router = express.Router();

router.get('/', validate(schemas.search, 'query'), globalSearch);

export default router;
