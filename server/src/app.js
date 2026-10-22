// d:\Projects\FPT\SWP391\server\src\app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './config/index.js';
import apiRoutes from './routes/index.js';
import {
  notFoundHandler,
  globalErrorHandler,
  requestId,
  apiLimiter,
} from './middlewares/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Tắt header X-Powered-By mặc định để tránh lộ công nghệ
app.disable('x-powered-by');

// 2. Gán mã định danh duy nhất (Request ID) cho mọi request để tiện tracing log
app.use(requestId);

// 3. Bảo mật HTTP Headers bằng Helmet (cho phép cross-origin và nới lỏng media-src để FE phát video, xem ảnh)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'media-src': ["'self'", 'data:', 'blob:', 'http:', 'https:'],
        'img-src': ["'self'", 'data:', 'blob:', 'http:', 'https:'],
      },
    },
  })
);

// 4. Nén phản hồi HTTP bằng Gzip để tiết kiệm băng thông và tăng tốc độ tải
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// 5. Cấu hình CORS chặt chẽ theo cấu hình client URL
app.use(
  cors({
    origin: config.clientUrl || '*',
    credentials: true,
  })
);

// 6. Phân tích cú pháp Request Body với giới hạn dung lượng 1MB
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 7. Phục vụ thư mục tệp tin tĩnh (static files) đã upload an toàn
const uploadsDirectory = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDirectory));
app.use('/api/uploads', express.static(uploadsDirectory));

// Root endpoint kiểm tra server
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running!',
  });
});

// Endpoint kiểm tra trạng thái hoạt động của hệ thống (Health Check)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// 8. Gắn toàn bộ API Endpoints với Rate Limiter bảo vệ
app.use('/api', apiLimiter, apiRoutes);

// 9. Middleware xử lý 404 Not Found khi truy cập sai endpoint
app.use(notFoundHandler);

// 10. Middleware xử lý lỗi tập trung toàn cục
app.use(globalErrorHandler);

export default app;
