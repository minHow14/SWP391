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

export const uploadPostMediaHandler = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest('Vui lòng chọn ít nhất một tệp để tải lên');
  }

  const uploadedFiles = req.files.map((file) => {
    const isVideo = file.mimetype.startsWith('video/');
    const limit = (isVideo ? 50 : 10) * 1024 * 1024;
    if (file.size > limit) {
      throw ApiError.badRequest(
        `Tệp "${file.originalname}" vượt quá giới hạn dung lượng (${isVideo ? 'video tối đa 50MB' : 'ảnh tối đa 10MB'}).`
      );
    }

    return {
      url: `/uploads/posts/${file.filename}`,
      type: isVideo ? 'video' : 'image',
      name: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  });

  return sendCreated(res, {
    message: 'Tải tệp đính kèm thành công',
    files: uploadedFiles,
  });
});
