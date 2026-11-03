// D:/SWP391/SWP391/server/src/middlewares/errorMiddleware.js
import { HTTP_STATUS } from '../constants/httpStatus.js';
import logger from '../config/logger.js';

/**
 * Middleware xử lý 404 Not Found khi truy cập sai endpoint
 */
export const notFoundHandler = (req, res) => {
  const message = `Endpoint không tồn tại: ${req.method} ${req.originalUrl}`;
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message,
    errorCode: 'ENDPOINT_NOT_FOUND',
    errors: [{ field: 'url', message }],
    error: message,
  });
};

/**
 * Middleware xử lý lỗi toàn cục (Global Error Handler) chuẩn API Contract
 */
export const globalErrorHandler = (err, req, res, next) => {
  const isUniqueViolation = err?.code === 'P2002';
  const isNotFoundPrisma = err?.code === 'P2025';
  const isForeignKeyViolation = err?.code === 'P2003';
  const isMulterError = err?.name === 'MulterError';

  let statusCode = err.statusCode || err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'Lỗi máy chủ nội bộ';

  if (err.type === 'entity.too.large') {
    errorCode = 'PAYLOAD_TOO_LARGE';
    message = 'Dữ liệu gửi lên vượt quá dung lượng cho phép.';
  } else if (isUniqueViolation) {
    statusCode = HTTP_STATUS.CONFLICT;
    errorCode = 'RESOURCE_ALREADY_EXISTS';
    message = 'Dữ liệu đã tồn tại';
  } else if (isNotFoundPrisma) {
    statusCode = HTTP_STATUS.NOT_FOUND;
    errorCode = 'RESOURCE_NOT_FOUND';
    message = 'Không tìm thấy dữ liệu yêu cầu';
  } else if (isForeignKeyViolation) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = 'FOREIGN_KEY_CONSTRAINT_FAILED';
    message = 'Dữ liệu liên kết không hợp lệ';
  } else if (isMulterError) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = 'FILE_UPLOAD_ERROR';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Tệp tải lên vượt quá dung lượng cho phép';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Vượt quá số lượng tệp được phép tải lên';
    } else {
      message = `Lỗi tải lên tệp tin: ${err.message}`;
    }
  } else if (statusCode === HTTP_STATUS.BAD_REQUEST) {
    errorCode = err.errorCode || 'VALIDATION_ERROR';
  } else if (statusCode === HTTP_STATUS.UNAUTHORIZED) {
    errorCode = 'UNAUTHORIZED';
  } else if (statusCode === HTTP_STATUS.FORBIDDEN) {
    errorCode = 'FORBIDDEN';
  } else if (statusCode === HTTP_STATUS.NOT_FOUND) {
    errorCode = 'RESOURCE_NOT_FOUND';
  }

  if (statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR && !err.statusCode) message = 'Lỗi máy chủ nội bộ';

  logger.error({
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    errorCode,
    message: err.message,
    stack: err.stack,
  });

  const errorsList = Array.isArray(err.details)
    ? err.details
    : Array.isArray(err.errors)
    ? err.errors
    : err.details
    ? [err.details]
    : [];

  res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    errors: errorsList,
    meta: { requestId: req.id, ...(err.resetAt ? { resetAt: err.resetAt } : {}) },
    // Thuộc tính tương thích ngược cho client/test cũ
    error: message,
    ...(err.details ? { details: err.details } : {}),
  });
};
