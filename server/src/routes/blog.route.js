import express from 'express';
import * as blogController from '../controllers/blog.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { schemas } from '../validators.js';

const router = express.Router();

router.get('/', blogController.getAllBlogs);
router.get('/:id', validate(schemas.idParams, 'params'), blogController.getBlogById);

// Các endpoint thay đổi dữ liệu yêu cầu xác thực JWT
router.post('/', authenticate, validate(schemas.createBlog), blogController.createBlog);
router.put('/:id', authenticate, validate(schemas.idParams, 'params'), validate(schemas.updateBlog), blogController.updateBlog);
router.delete('/:id', authenticate, validate(schemas.idParams, 'params'), blogController.deleteBlog);

export default router;
