import { ApiError } from '../utils/apiError.js';

export const validate = (schema, location = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[location]);
  if (!result.success) {
    return next(ApiError.badRequest('Dữ liệu yêu cầu không hợp lệ', result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))));
  }
  req[location] = result.data;
  next();
};
