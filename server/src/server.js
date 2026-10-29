// D:/SWP391/SWP391/server/src/server.js
import app from './app.js';
import config from './config/index.js';
import prisma from './config/prisma.js';
import { startAutoPurgeCron } from './services/purge.service.js';
import { runVideoRecipeSummaryWorker } from './workers/videoRecipeSummaryWorker.js';
import { logger } from './config/logger.js';

let purgeCronInterval = null;
const workerController = new AbortController();
let videoWorker = Promise.resolve();

const server = app.listen(config.port, () => {
  videoWorker = runVideoRecipeSummaryWorker({ signal: workerController.signal }).catch((error) => {
    logger.error({ errorCode: error.errorCode || 'VIDEO_WORKER_ERROR' }, 'Video recipe worker stopped unexpectedly');
  });
  console.log(`===============================================`);
  console.log(`🚀 Server running on: http://localhost:${config.port}`);
  console.log(`⚙️  Environment: ${config.env}`);
  console.log(`🔗 Health check: http://localhost:${config.port}/health`);
  console.log(`🗄️  Database: PostgreSQL via Prisma ORM connected`);
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
  server.close(async () => {
    try {
      await videoWorker;
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
