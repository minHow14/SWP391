// d:\Projects\FPT\SWP391\server\src\utils\apiResponse.js
import { HTTP_STATUS } from '../constants/httpStatus.js';

/**
 * Trả về phản hồi thành công chuẩn RESTful theo API Contract thống nhất
 * Format: { success: true, message: string, data: any, meta?: object }
 * @param {import('express').Response} res - Express response
 * @param {object|any} payload - Dữ liệu trả về (object hoặc array)
 * @param {number} statusCode - HTTP status code (mặc định 200)
 * @param {object} extraMeta - Metadata bổ sung nếu có
 */
export const sendSuccess = (res, payload = {}, statusCode = HTTP_STATUS.OK, extraMeta = {}) => {
  const isObject = typeof payload === 'object' && payload !== null && !Array.isArray(payload);

  const message = isObject && payload.message ? payload.message : 'Thành công';
  const meta = isObject && payload.meta ? payload.meta : undefined;
  const requestId = res.locals?.requestId;

  let combinedMeta = undefined;
  if (meta || Object.keys(extraMeta).length > 0 || requestId) {
    combinedMeta = {
      ...(requestId ? { requestId } : {}),
      ...(meta || {}),
      ...(extraMeta || {}),
    };
    if (Object.keys(combinedMeta).length === 0) {
      combinedMeta = undefined;
    }
  }

  // Lấy data cốt lõi: nếu payload đã có field `data` thì dùng, ngược lại bóc tách message và meta
  let data;
  if (isObject && 'data' in payload) {
    data = payload.data;
  } else if (isObject) {
    const { message: _m, meta: _meta, ...rest } = payload;
    data = rest;
  } else {
    data = payload;
  }

  const responseBody = {
    success: true,
    message,
    data,
    ...(combinedMeta ? { meta: combinedMeta } : {}),
    // Giữ các trường cấp root từ payload để tương thích ngược 100% với FE và integration tests
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
  const requestId = res.locals?.requestId;

  const responseBody = {
    success: false,
    message,
    errorCode,
    errors: errorsList,
    // Thuộc tính tương thích ngược cho client/test cũ
    error: {
      code: errorCode,
      message,
      ...(details !== null && details !== undefined ? { details } : {}),
    },
    ...(details !== null && details !== undefined ? { details } : {}),
    ...(requestId ? { meta: { requestId } } : {}),
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
