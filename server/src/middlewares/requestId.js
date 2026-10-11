import { randomUUID } from 'node:crypto';

// Dùng X-Request-Id của client nếu có, ngược lại sinh req_<id>; trả lại qua header phản hồi.
export function requestId(req, res, next) {
  const id = req.get('X-Request-Id') || `req_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  res.locals.requestId = id;
  res.set('X-Request-Id', id);
  next();
}
