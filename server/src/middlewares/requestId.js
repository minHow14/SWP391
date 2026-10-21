// d:\Projects\FPT\SWP391\server\src\middlewares\requestId.js
import { randomUUID } from 'node:crypto';

/**
 * Middleware gán mã định danh duy nhất (Request ID) cho mọi request HTTP
 * Giúp tracing và debug log xuyên suốt giữa Client, Server và AI Service
 */
export function requestId(req, res, next) {
  const id = req.get('X-Request-Id') || `req_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  req.id = id;
  res.locals.requestId = id;
  res.set('X-Request-Id', id);
  next();
}
