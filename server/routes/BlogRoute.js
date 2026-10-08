// JavaScript source code
import express from 'express';
import * as controller from '../controllers/BlogController.js';

const router = express.Router();
router.post('/', controller.createBlog);
router.get('/', controller.getAllBlogs);
router.get('/:id', controller.getBlogById);
router.put('/:id', controller.updateBlog);
router.delete('/:id', controller.deleteBlog);

export default router;