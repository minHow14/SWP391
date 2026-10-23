// D:/SWP391/SWP391/server/src/middlewares/errorMiddleware.js
import { HTTP_STATUS } from '../constants/httpStatus.js';

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

  let statusCode = err.statusCode || err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'Lỗi máy chủ nội bộ';

  if (isUniqueViolation) {
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
  console.error(`[Error Handler ${statusCode}][${errorCode}]`);

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
