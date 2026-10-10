import { HTTP_STATUS } from '../constants/httpStatus.js';

/**
 * Middleware xử lý 404 Not Found
 */
export const notFoundHandler = (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: `Endpoint không tồn tại: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Middleware xử lý lỗi toàn cục (Global Error Handler)
 */
export const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[Error Handler ${statusCode}]:`, err.message || err);

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Lỗi máy chủ nội bộ',
    ...(err.details ? { details: err.details } : {}),
    ...(!isProduction && err.stack ? { stack: err.stack } : {}),
  });
};
