// d:\Projects\FPT\SWP391\server\src\config\logger.js
import pino from 'pino';
import config from './index.js';

export const logger = pino({
  level: config.isTest ? 'silent' : config.isProduction ? 'info' : 'debug',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
