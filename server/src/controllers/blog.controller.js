// D:/SWP391/SWP391/server/src/controllers/blog.controller.js
// Controller blog: CRUD bài viết, gắn tác giả từ token và trả 202 khi nội dung đang chờ AI kiểm duyệt.
import { blogService } from '../services/blog.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

// Tạo blog; nếu service tạo job kiểm duyệt AI thì trả 202 kèm jobId, ngược lại 201.
export const createBlog = asyncHandler(async (req, res) => {
  // Lấy author_id từ token người dùng đã xác thực (chống giả mạo author_id)
  const payload = {
    ...req.body,
    author_id: req.user.user_id,
  };
  const { jobId, moderationStatus, ...blog } = await blogService.createBlog(payload);
  return sendSuccess(res, { blog, ...(jobId && { jobId, moderationStatus }) }, jobId ? HTTP_STATUS.ACCEPTED : HTTP_STATUS.CREATED);
});

// Danh sách blog; hỗ trợ cả kết quả có phân trang (meta) lẫn mảng thuần.
export const getAllBlogs = asyncHandler(async (req, res) => {
  const result = await blogService.getAllBlogs(req.query);
  if (result && result.meta) {
    return sendSuccess(res, { blogs: result.blogs, meta: result.meta });
  }
  return sendSuccess(res, { blogs: result });
});

// Chi tiết blog; req.user (nếu có) giúp service trả thêm thông tin riêng của người xem.
export const getBlogById = asyncHandler(async (req, res) => {
  const blog = await blogService.getBlogById(req.params.id, req.user);
  return sendSuccess(res, { blog });
});

// Cập nhật blog (service kiểm tra quyền chủ bài); trả 202 nếu cần kiểm duyệt lại.
export const updateBlog = asyncHandler(async (req, res) => {
  const { jobId, moderationStatus, ...blog } = await blogService.updateBlog(req.params.id, req.body, req.user);
  return sendSuccess(res, { blog, ...(jobId && { jobId, moderationStatus }) }, jobId ? HTTP_STATUS.ACCEPTED : HTTP_STATUS.OK);
});

// Xóa blog, service kiểm tra quyền chủ bài.
export const deleteBlog = asyncHandler(async (req, res) => {
  const result = await blogService.deleteBlog(req.params.id, req.user);
  return sendSuccess(res, result);
});
