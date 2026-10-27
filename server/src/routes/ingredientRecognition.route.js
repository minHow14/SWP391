// d:/Projects/FPT/SWP391/server/src/routes/ingredientRecognition.route.js
import { Router } from 'express';
import * as controller from '../controllers/ingredientRecognition.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authenticateAiCaller } from '../middlewares/aiIdentityMiddleware.js';
import { uploadRecognitionImage } from '../middlewares/upload.js';
import { validate } from '../middlewares/validationMiddleware.js';
import {
  listScansQuerySchema,
  recognizeOptionsSchema,
  scanIdParamsSchema,
} from '../validators/ingredientRecognition.validator.js';

const router = Router();

// Endpoint nhận diện ảnh nguyên liệu & tủ lạnh (cho phép cả tài khoản đã đăng nhập và khách)
router.post(
  '/recognize',
  authenticateAiCaller,
  uploadRecognitionImage,
  validate(recognizeOptionsSchema, 'body'),
  controller.recognize
);

// Xem chi tiết phiên quét (hỗ trợ cả khách lẫn người dùng)
router.get(
  '/history/:id',
  authenticateAiCaller,
  validate(scanIdParamsSchema, 'params'),
  controller.getScanById
);

// Quản lý lịch sử quét của tài khoản (yêu cầu đăng nhập JWT)
router.get(
  '/history',
  authenticate,
  validate(listScansQuerySchema, 'query'),
  controller.getScanHistory
);

router.delete(
  '/history/:id',
  authenticate,
  validate(scanIdParamsSchema, 'params'),
  controller.deleteScan
);

export default router;
