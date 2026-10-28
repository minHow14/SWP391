// D:/SWP391/SWP391/server/src/workers/videoRecipeSummaryWorker.js
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import prisma from '../config/prisma.js';
import { videoRecipeSummaryConfig } from '../config/videoRecipeSummaryConfig.js';
import { videoRecipeSummaryLogger } from '../config/videoRecipeSummaryLogger.js';
import { videoRecipeSummaryJobRepository } from '../repositories/videoRecipeSummaryJobRepository.js';
import { processVideoRecipeSummaryJob } from '../services/videoRecipeSummaryProcessor.js';
import { videoRecipeSummaryError } from '../utils/videoRecipeSummaryError.js';

async function processWithHeartbeat(job, context) {
  const controller = new AbortController();
  const signal = AbortSignal.any([context.signal, controller.signal]);
  let renewing = false;
  let heartbeat = Promise.resolve();
  const timer = setInterval(() => {
    if (renewing) return;
    renewing = true;
    heartbeat = context.repository.renew({ job, leaseMs: context.config.leaseMs })
      .catch((error) => controller.abort(error)).finally(() => { renewing = false; });
  }, Math.floor(context.config.leaseMs / 3));
  try {
    return await context.processJob(job, { repository: context.repository, config: context.config, signal });
  } finally { clearInterval(timer); await heartbeat; }
}

export async function runVideoRecipeSummaryWorker(options = {}) {
  const context = { repository: videoRecipeSummaryJobRepository, config: videoRecipeSummaryConfig,
    logger: videoRecipeSummaryLogger, processJob: processVideoRecipeSummaryJob, signal: new AbortController().signal, ...options };
  context.logger.info('Video recipe worker started');
  while (!context.signal.aborted) {
    try {
      await context.repository.recoverExpired(context.config);
      const job = await context.repository.claim(context.config);
      if (job) {
        const result = await processWithHeartbeat(job, context);
        context.logger.info({ jobId: job.id, status: result.status, errorCode: result.errorCode }, 'Video recipe job processed');
        continue;
      }
    } catch (error) { context.logger.error({ errorCode: error.errorCode || 'VIDEO_WORKER_ERROR' }, 'Video recipe worker operation failed'); }
    await delay(context.config.pollMs, undefined, { signal: context.signal }).catch(() => {});
  }
  context.logger.info('Video recipe worker stopped');
}

async function main() {
  const controller = new AbortController();
  const stop = () => controller.abort(videoRecipeSummaryError({ status: 503, code: 'VIDEO_WORKER_SHUTDOWN',
    message: 'Tiến trình đang dừng; tác vụ sẽ được thử lại.', retryable: true }));
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try { await runVideoRecipeSummaryWorker({ signal: controller.signal }); }
  finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); await prisma.$disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { videoRecipeSummaryLogger.fatal('Video recipe worker stopped unexpectedly'); process.exitCode = 1; });
}
