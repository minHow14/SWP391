// d:\Projects\FPT\SWP391\server\src\middlewares\requestId.js
// Middleware gắn Request ID cho mỗi request phục vụ truy vết log.
import { randomUUID } from 'node:crypto';

/**
 * Middleware gán mã định danh duy nhất (Request ID) cho mọi request HTTP
 * Giúp tracing và debug log xuyên suốt giữa Client, Server và AI Service
 */
export function requestId(req, res, next) {
  // Dùng lại X-Request-Id từ client nếu có để nối log xuyên suốt, nếu không thì tự sinh mã ngắn.
  const id = req.get('X-Request-Id') || `req_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  req.id = id;
  res.locals.requestId = id;
  res.set('X-Request-Id', id);
  next();
}
