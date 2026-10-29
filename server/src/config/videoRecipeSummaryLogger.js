// server/src/config/videoRecipeSummaryLogger.js
import pino from 'pino';

export const videoRecipeSummaryLogger = pino({ name: 'video-recipe-worker',
  redact: { paths: ['authorization', 'headers', 'internalApiKey', 'transcript', 'recipe'], remove: true } });
