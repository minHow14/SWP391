// d:\Projects\FPT\SWP391\server\src\controllers\upload.controller.js
// Controller xử lý file đã được multer lưu: kiểm tra định dạng thực bằng magic bytes,
// xóa file không hợp lệ và trả đường dẫn tương đối để lưu vào DB.
import fs from 'node:fs';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { detectImageMimeType, IMAGE_SIGNATURE_BYTES } from '../utils/imageSignature.js';

/**
 * Kiểm tra Magic Bytes đầu file để xác thực định dạng ảnh thực sự
 */
// Không tin MIME type/đuôi file do client gửi vì có thể giả mạo; đọc byte đầu file để xác định thật.
// Lỗi đọc file coi như không hợp lệ.
const isValidImageMagicBytes = (filePath) => {
  try {
    const buffer = Buffer.alloc(IMAGE_SIGNATURE_BYTES);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, IMAGE_SIGNATURE_BYTES, 0);
    fs.closeSync(fd);
    return detectImageMimeType(buffer) !== null;
  } catch {
    return false;
  }
};

// Xóa file an toàn, không ném lỗi để không che mất lỗi gốc trả về client.
const safeUnlink = (filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Bỏ qua lỗi dọn dẹp
  }
};

// Xử lý upload ảnh đại diện: bắt buộc có file và phải là ảnh thật.
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

// Xử lý upload một ảnh cho bài viết.
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

// Xử lý upload nhiều file đính kèm bài viết: video tối đa 50MB, ảnh tối đa 10MB và phải là ảnh thật.
// Chỉ một file lỗi là hủy cả lô để không để lại file mồ côi trên đĩa.
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
