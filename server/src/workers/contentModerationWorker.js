// D:/SWP391/SWP391/server/src/workers/contentModerationWorker.js
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import prisma from '../config/prisma.js';
import { logger } from '../config/logger.js';
import { contentModerationConfig } from '../config/contentModerationConfig.js';
import { contentModerationRepository } from '../repositories/contentModerationRepository.js';
import { processContentModerationJob } from '../services/contentModerationProcessor.js';

export async function runContentModerationWorker(options = {}) {
  const { repository = contentModerationRepository, config = contentModerationConfig,
    processJob = processContentModerationJob, log = logger, signal = new AbortController().signal } = options;
  if (!config.enabled) { log.info('Content moderation is disabled'); return; }
  log.info('Content moderation worker started');
  while (!signal.aborted) {
    try {
      await repository.recoverExpired(config);
      const job = await repository.claim(config);
      if (job) {
        const result = await processJob(job, { repository, config, signal });
        log.info({ jobId: job.id, status: result.status, errorCode: result.errorCode }, 'Content moderation job processed');
        continue;
      }
    } catch (error) { log.error({ errorCode: error.errorCode || 'MODERATION_WORKER_ERROR' }, 'Content moderation worker operation failed'); }
    await delay(config.pollMs, undefined, { signal }).catch(() => {});
  }
  log.info('Content moderation worker stopped');
}

async function main() {
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try { await runContentModerationWorker({ signal: controller.signal }); }
  finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); await prisma.$disconnect(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { logger.fatal('Content moderation worker stopped unexpectedly'); process.exitCode = 1; });
}
