// d:\Projects\FPT\SWP391\server\src\controllers\upload.controller.js
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const uploadAvatarHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Vui lòng chọn một tệp hình ảnh để tải lên');
  }

  const relativePath = `/uploads/avatars/${req.file.filename}`;
  return sendCreated(res, {
    message: 'Tải ảnh đại diện thành công',
    url: relativePath,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

export const uploadPostImageHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Vui lòng chọn một tệp hình ảnh để tải lên');
  }

  const relativePath = `/uploads/posts/${req.file.filename}`;
  return sendCreated(res, {
    message: 'Tải ảnh bài viết thành công',
    url: relativePath,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});
