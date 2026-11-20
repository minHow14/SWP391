// d:\Projects\FPT\SWP391\server\src\middlewares\asyncMiddleware.js
// Tiện ích bọc controller bất đồng bộ để lỗi tự chuyển tới middleware xử lý lỗi.
/**
 * Bọc hàm xử lý controller để bắt các ngoại lệ đồng bộ/bất đồng bộ
 * và chuyển đến globalErrorHandler mà không cần viết try-catch thủ công.
 *
 * @param {Function} fn - Hàm controller (req, res, next)
 * @returns {Function} Middleware Express (req, res, next)
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
