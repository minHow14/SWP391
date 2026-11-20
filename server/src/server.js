// D:/SWP391/SWP391/server/src/server.js
// Điểm khởi động Back-end: mở cổng HTTP, chạy các worker nền (video, kiểm duyệt, tra cứu nguyên liệu),
// cron tự động dọn dữ liệu và xử lý tắt server an toàn.
import app from './app.js';
import config from './config/index.js';
import prisma from './config/prisma.js';
import { startAutoPurgeCron } from './services/purge.service.js';
import { runVideoRecipeSummaryWorker } from './workers/videoRecipeSummaryWorker.js';
import { runContentModerationWorker } from './workers/contentModerationWorker.js';
import { runIngredientLookupWorker } from './workers/ingredientLookupWorker.js';
import { logger } from './config/logger.js';

let purgeCronInterval = null;
// AbortController dùng chung để báo dừng cho tất cả worker nền khi tắt server.
const workerController = new AbortController();
let backgroundWorkers = Promise.resolve();

const server = app.listen(config.port, () => {
  // Worker chạy cùng tiến trình API; lỗi chỉ được ghi log để không làm sập server.
  const videoWorker = runVideoRecipeSummaryWorker({ signal: workerController.signal }).catch((error) => {
    logger.error({ errorCode: error.errorCode || 'VIDEO_WORKER_ERROR' }, 'Video recipe worker stopped unexpectedly');
  });
  // Chạy cùng API để bài đăng/bình luận không bị kẹt ở PENDING_MODERATION chỉ vì chưa mở thêm terminal chạy worker.
  const moderationWorker = runContentModerationWorker({ signal: workerController.signal }).catch((error) => {
    logger.error({ errorCode: error.errorCode || 'MODERATION_WORKER_ERROR' }, 'Content moderation worker stopped unexpectedly');
  });
  const ingredientWorker = runIngredientLookupWorker({ signal: workerController.signal }).catch((error) => {
    logger.error({ errorCode: error.errorCode || 'INGREDIENT_LOOKUP_WORKER_ERROR' }, 'Ingredient lookup worker stopped unexpectedly');
  });
  backgroundWorkers = Promise.all([videoWorker, moderationWorker, ingredientWorker]);
  console.log(`===============================================`);
  console.log(`🚀 Server running on: http://localhost:${config.port}`);
  console.log(`⚙️  Environment: ${config.env}`);
  console.log(`🔗 Health check: http://localhost:${config.port}/health`);
  console.log(`🗄️  Database: PostgreSQL via Prisma ORM connected`);
  // Không bật cron dọn dữ liệu khi chạy test để tránh xoá dữ liệu test ngoài ý muốn.
  if (config.env !== 'test') {
    purgeCronInterval = startAutoPurgeCron();
  }
  console.log(`===============================================`);
});

// Xử lý lỗi Unhandled Rejection (Promise bị reject mà không có catch)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Xử lý lỗi Uncaught Exception (Ngoại lệ đồng bộ không được bắt)
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

// Graceful shutdown khi nhận tín hiệu đóng server (SIGTERM / SIGINT)
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Closing HTTP server and database connections gracefully...`);
  if (purgeCronInterval) {
    clearInterval(purgeCronInterval);
  }
  workerController.abort();
  // Ngừng nhận kết nối mới, đợi worker nền kết thúc rồi mới ngắt kết nối DB để không cắt ngang job đang xử lý.
  server.close(async () => {
    try {
      await backgroundWorkers;
      await prisma.$disconnect();
      console.log('Database connection disconnected.');
    } catch (err) {
      console.error('Error disconnecting database:', err);
    }
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
