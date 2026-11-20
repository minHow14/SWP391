// d:\Projects\FPT\SWP391\server\src/middlewares/validationMiddleware.js
// Middleware kiểm tra dữ liệu request bằng schema Zod.
import { ApiError } from '../utils/apiError.js';

// Kiểm tra req[location] (body/query/params) theo schema; lỗi thì trả 400 kèm danh sách trường sai.
export const validate = (schema, location = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[location]);
  if (!result.success) {
    return next(ApiError.badRequest('Dữ liệu yêu cầu không hợp lệ', result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))));
  }
  // Express 5 dùng getter cho req.query; thay bằng dữ liệu đã kiểm tra trên request hiện tại.
  Object.defineProperty(req, location, { value: result.data, configurable: true, writable: true });
  next();
};
