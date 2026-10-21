// d:\Projects\FPT\SWP391\server\src\utils\apiResponse.js
import { HTTP_STATUS } from '../constants/httpStatus.js';

/**
 * Trả về phản hồi thành công chuẩn RESTful theo API Contract thống nhất
 * Thỏa mãn cả chuẩn mới { success, message, data, meta } lẫn tính tương thích ngược
 * @param {import('express').Response} res - Express response
 * @param {object|any} payload - Dữ liệu trả về (object hoặc array)
 * @param {number} statusCode - HTTP status code (mặc định 200)
 */
export const sendSuccess = (res, payload = {}, statusCode = HTTP_STATUS.OK) => {
  const isObject = typeof payload === 'object' && payload !== null && !Array.isArray(payload);

  const message = isObject && payload.message ? payload.message : 'Thành công';
  const meta = isObject && payload.meta ? payload.meta : undefined;

  // Lấy data cốt lõi: nếu payload đã có data thì dùng, ngược lại data là chính payload
  let data;
  if (isObject && 'data' in payload) {
    data = payload.data;
  } else if (isObject) {
    // Loại bỏ message và meta ra khỏi data wrapper
    const { message: _m, meta: _meta, ...rest } = payload;
    data = rest;
  } else {
    data = payload;
  }

  const responseBody = {
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
    // Giữ các trường ở cấp root nếu có để đảm bảo 100% tương thích ngược
    ...(isObject ? payload : {}),
  };

  return res.status(statusCode).json(responseBody);
};

/**
 * Trả về phản hồi tạo mới thành công (HTTP 201)
 * @param {import('express').Response} res
 * @param {object|any} payload
 */
export const sendCreated = (res, payload = {}) => {
  return sendSuccess(res, payload, HTTP_STATUS.CREATED);
};

/**
 * Trả về phản hồi lỗi chuẩn theo API Contract
 * Format: { success: false, message, errorCode, errors, details }
 * @param {import('express').Response} res - Express response
 * @param {string} error - Thông báo lỗi
 * @param {number} statusCode - HTTP status code (mặc định 500)
 * @param {any} details - Chi tiết kỹ thuật hoặc danh sách lỗi validate
 * @param {string} errorCode - Mã lỗi nghiệp vụ định danh
 */
export const sendError = (
  res,
  error = 'Lỗi máy chủ nội bộ',
  statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details = null,
  errorCode = 'INTERNAL_ERROR'
) => {
  const message = typeof error === 'string' ? error : error?.message || 'Lỗi máy chủ';
  const errorsList = Array.isArray(details) ? details : details ? [details] : [];

  const responseBody = {
    success: false,
    message,
    errorCode,
    errors: errorsList,
    // Thuộc tính tương thích ngược cho client/test cũ
    error: message,
    ...(details ? { details } : {}),
  };

  return res.status(statusCode).json(responseBody);
};

/**
 * Helper Envelope tương thích với module places và tracking theo Request ID
 */
export const ok = (res, data, status = HTTP_STATUS.OK, extraMeta = {}) =>
  res.status(status).json({
    success: true,
    data,
    meta: { requestId: res.locals?.requestId, ...extraMeta },
  });

export const fail = (res, status = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = 'INTERNAL_ERROR', message = 'Lỗi xử lý', details) =>
  res.status(status).json({
    success: false,
    error: { code, message, ...(details !== undefined && { details }) },
    meta: { requestId: res.locals?.requestId },
    errorCode: code,
    message,
    errors: Array.isArray(details) ? details : details ? [details] : [],
    ...(details !== undefined ? { details } : {}),
  });
