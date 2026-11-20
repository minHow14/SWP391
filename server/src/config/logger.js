// d:\Projects\FPT\SWP391\server\src\config\logger.js
// Logger dùng chung (pino), xuất JSON với thời gian ISO.
import pino from 'pino';
import config from './index.js';

export const logger = pino({
  // Tắt log khi chạy test, production chỉ ghi từ mức info, phát triển ghi cả debug.
  level: config.isTest ? 'silent' : config.isProduction ? 'info' : 'debug',
  formatters: {
    // Ghi level dạng chữ (info, error...) thay vì số để dễ đọc.
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
