// D:/SWP391/SWP391/server/src/config/videoRecipeSummaryLogger.js
// Logger riêng cho worker video; loại bỏ khoá bí mật và nội dung lớn (transcript, công thức) khỏi log.
import pino from 'pino';

export const videoRecipeSummaryLogger = pino({ name: 'video-recipe-worker',
  redact: { paths: ['authorization', 'headers', 'internalApiKey', 'transcript', 'recipe'], remove: true } });
