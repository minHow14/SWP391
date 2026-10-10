import { HTTP_STATUS } from '../constants/httpStatus.js';

/**
 * Custom Error class hỗ trợ gắn HTTP status code và thông tin chi tiết
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP Status code (mặc định 500)
   * @param {string} message - Thông báo lỗi
   * @param {any} details - Chi tiết lỗi (tùy chọn)
   */
  constructor(statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, message = 'Lỗi máy chủ nội bộ', details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = 'Dữ liệu yêu cầu không hợp lệ', details = null) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, message, details);
  }

  static unauthorized(message = 'Không có quyền truy cập: Chưa xác thực', details = null) {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, message, details);
  }

  static forbidden(message = 'Từ chối truy cập: Không đủ quyền hạn', details = null) {
    return new ApiError(HTTP_STATUS.FORBIDDEN, message, details);
  }

  static notFound(message = 'Không tìm thấy tài nguyên', details = null) {
    return new ApiError(HTTP_STATUS.NOT_FOUND, message, details);
  }

  static conflict(message = 'Dữ liệu đã tồn tại hoặc xảy ra xung đột', details = null) {
    return new ApiError(HTTP_STATUS.CONFLICT, message, details);
  }

  static internal(message = 'Lỗi máy chủ nội bộ', details = null) {
    return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, message, details);
  }
}
