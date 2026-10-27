// d:\Projects\FPT\SWP391\server\src\controllers\blog.controller.js
import { blogService } from '../services/blog.service.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

export const createBlog = asyncHandler(async (req, res) => {
  // Lấy author_id từ token người dùng đã xác thực (chống giả mạo author_id)
  const payload = {
    ...req.body,
    author_id: req.user.user_id,
  };
  const newBlog = await blogService.createBlog(payload);
  return sendCreated(res, { blog: newBlog });
});

export const getAllBlogs = asyncHandler(async (req, res) => {
  const result = await blogService.getAllBlogs(req.query);
  if (result && result.meta) {
    return sendSuccess(res, { blogs: result.blogs, meta: result.meta });
  }
  return sendSuccess(res, { blogs: result });
});

export const getBlogById = asyncHandler(async (req, res) => {
  const blog = await blogService.getBlogById(req.params.id);
  return sendSuccess(res, { blog });
});

export const updateBlog = asyncHandler(async (req, res) => {
  const updated = await blogService.updateBlog(req.params.id, req.body, req.user);
  return sendSuccess(res, { blog: updated });
});

export const deleteBlog = asyncHandler(async (req, res) => {
  const result = await blogService.deleteBlog(req.params.id, req.user);
  return sendSuccess(res, result);
});
