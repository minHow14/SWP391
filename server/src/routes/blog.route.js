import express from 'express';
import * as blogController from '../controllers/blog.controller.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', blogController.getAllBlogs);
router.get('/:id', blogController.getBlogById);

// Các endpoint thay đổi dữ liệu yêu cầu xác thực JWT
router.post('/', authenticate, blogController.createBlog);
router.put('/:id', authenticate, blogController.updateBlog);
router.delete('/:id', authenticate, blogController.deleteBlog);

export default router;
