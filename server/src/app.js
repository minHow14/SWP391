import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/index.js';

const app = express();

// Middlewares xử lý request & CORS
app.use(
  cors({
    origin: config.clientUrl || '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint kiểm tra trạng thái hoạt động của hệ thống (Health Check)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// Gắn toàn bộ API Endpoints
app.use('/api', apiRoutes);

// Middleware xử lý 404 Not Found khi truy cập sai endpoint
app.use(notFoundHandler);

// Middleware xử lý lỗi tập trung toàn cục
app.use(globalErrorHandler);

export default app;

