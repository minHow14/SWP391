import { HTTP_STATUS } from '../constants/httpStatus.js';

/**
 * Trả về phản hồi thành công chuẩn RESTful, đảm bảo 100% tương thích ngược
 * @param {import('express').Response} res - Express response
 * @param {object|any} payload - Dữ liệu trả về (object hoặc array)
 * @param {number} statusCode - HTTP status code (mặc định 200)
 */
export const sendSuccess = (res, payload = {}, statusCode = HTTP_STATUS.OK) => {
  if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
    return res.status(statusCode).json({
      success: true,
      ...payload,
    });
  }

  return res.status(statusCode).json({
    success: true,
    data: payload,
  });
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
 * Trả về phản hồi lỗi chuẩn
 * @param {import('express').Response} res - Express response
 * @param {string} error - Thông báo lỗi
 * @param {number} statusCode - HTTP status code (mặc định 500)
 * @param {any} details - Chi tiết kỹ thuật hoặc danh sách lỗi validate
 */
export const sendError = (res, error = 'Lỗi máy chủ nội bộ', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) => {
  const responseBody = {
    success: false,
    error: typeof error === 'string' ? error : error?.message || 'Lỗi máy chủ',
  };

  if (details) {
    responseBody.details = details;
  }

  return res.status(statusCode).json(responseBody);
};
