// d:\Projects\FPT\SWP391\server\src\routes\report.route.js
import express from 'express';
import * as reportController from '../controllers/report.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { schemas } from '../validators/index.js';

const router = express.Router();

router.post('/', authenticate, validate(schemas.createReport), reportController.createReport);

export default router;
