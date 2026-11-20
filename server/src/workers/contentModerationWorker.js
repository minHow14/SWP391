// D:/SWP391/SWP391/server/src/workers/contentModerationWorker.js
// Worker nền kiểm duyệt nội dung bằng AI: liên tục thu hồi job hết lease, nhận job kế tiếp và xử lý.
// Có thể chạy cùng server hoặc chạy độc lập bằng lệnh worker:content-moderation.
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import prisma from '../config/prisma.js';
import { logger } from '../config/logger.js';
import { contentModerationConfig } from '../config/contentModerationConfig.js';
import { contentModerationRepository } from '../repositories/contentModerationRepository.js';
import { processContentModerationJob } from '../services/contentModerationProcessor.js';

// Vòng lặp worker; các phụ thuộc được truyền qua options để test có thể thay thế.
export async function runContentModerationWorker(options = {}) {
  const { repository = contentModerationRepository, config = contentModerationConfig,
    processJob = processContentModerationJob, log = logger, signal = new AbortController().signal } = options;
  // Tính năng tắt thì thoát ngay, không poll DB.
  if (!config.enabled) { log.info('Content moderation is disabled'); return; }
  log.info('Content moderation worker started');
  while (!signal.aborted) {
    try {
      // Thu hồi các job có lease hết hạn (worker trước bị chết) để không job nào bị kẹt.
      await repository.recoverExpired(config);
      const job = await repository.claim(config);
      if (job) {
        const result = await processJob(job, { repository, config, signal });
        log.info({ jobId: job.id, status: result.status, errorCode: result.errorCode }, 'Content moderation job processed');
        // Có job thì xử lý tiếp ngay, không chờ chu kỳ poll.
        continue;
      }
    // Lỗi một lượt chỉ ghi log để worker tiếp tục chạy.
    } catch (error) { log.error({ errorCode: error.errorCode || 'MODERATION_WORKER_ERROR' }, 'Content moderation worker operation failed'); }
    // Chờ chu kỳ poll; tín hiệu dừng sẽ cắt ngang việc chờ.
    await delay(config.pollMs, undefined, { signal }).catch(() => {});
  }
  log.info('Content moderation worker stopped');
}

// Chạy worker độc lập: dừng an toàn khi nhận SIGINT/SIGTERM và ngắt kết nối DB khi kết thúc.
async function main() {
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try { await runContentModerationWorker({ signal: controller.signal }); }
  finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); await prisma.$disconnect(); }
}
// Chỉ chạy main khi file được gọi trực tiếp bằng node.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { logger.fatal('Content moderation worker stopped unexpectedly'); process.exitCode = 1; });
}
