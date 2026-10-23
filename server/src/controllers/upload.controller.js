// d:\Projects\FPT\SWP391\server\src\controllers\upload.controller.js
import fs from 'node:fs';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Kiểm tra Magic Bytes đầu file để xác thực định dạng ảnh thực sự
 */
const isValidImageMagicBytes = (filePath) => {
  try {
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
    // GIF: 47 49 46 38 ('GIF8')
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
    // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
    if (
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) return true;

    return false;
  } catch {
    return false;
  }
};

const safeUnlink = (filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Bỏ qua lỗi dọn dẹp
  }
};

export const uploadAvatarHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Vui lòng chọn một tệp hình ảnh để tải lên');
  }

  if (!isValidImageMagicBytes(req.file.path)) {
    safeUnlink(req.file.path);
    throw ApiError.badRequest('Tệp tải lên không phải là hình ảnh hợp lệ');
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

  if (!isValidImageMagicBytes(req.file.path)) {
    safeUnlink(req.file.path);
    throw ApiError.badRequest('Tệp tải lên không phải là hình ảnh hợp lệ');
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

  try {
    const uploadedFiles = req.files.map((file) => {
      const isVideo = file.mimetype.startsWith('video/');
      const limit = (isVideo ? 50 : 10) * 1024 * 1024;
      if (file.size > limit) {
        throw ApiError.badRequest(
          `Tệp "${file.originalname}" vượt quá giới hạn dung lượng (${isVideo ? 'video tối đa 50MB' : 'ảnh tối đa 10MB'}).`
        );
      }

      if (!isVideo && !isValidImageMagicBytes(file.path)) {
        throw ApiError.badRequest(`Tệp "${file.originalname}" không phải là ảnh hợp lệ.`);
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
  } catch (error) {
    // Dọn dẹp toàn bộ các tệp đã upload nếu có lỗi xảy ra
    for (const f of req.files) {
      safeUnlink(f.path);
    }
    throw error;
  }
});
