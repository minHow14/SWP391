/**
 * Bọc hàm xử lý controller để bắt các ngoại lệ đồng bộ/bất đồng bộ
 * và chuyển đến globalErrorHandler mà không cần viết try-catch thủ công.
 *
 * @param {Function} fn - Controller function (req, res, next)
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

