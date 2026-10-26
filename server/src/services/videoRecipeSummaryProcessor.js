// D:/SWP391/SWP391/server/src/services/videoRecipeSummaryProcessor.js
import { videoRecipeSummaryJobRepository } from '../repositories/videoRecipeSummaryJobRepository.js';
import { videoRecipeSummaryAiService } from './videoRecipeSummaryAiService.js';
import { youtubeMetadataService } from './youtubeMetadataService.js';
import { videoRecipeSummaryConfig } from '../config/videoRecipeSummaryConfig.js';
import { transcriptSchema, validateVideoRecipe } from '../validators/videoRecipeSummaryValidator.js';
import { videoRecipeSummaryError } from '../utils/videoRecipeSummaryError.js';

function safeFailure(error, signal) {
  if (signal.aborted && signal.reason?.errorCode) return signal.reason;
  if (error.errorCode) return error;
  if (error.name === 'ZodError') return videoRecipeSummaryError({ status: 502, code: 'VIDEO_AI_INVALID_OUTPUT', message: 'Nội dung nhận dạng hoặc công thức không hợp lệ.' });
  return videoRecipeSummaryError({ status: 503, code: 'VIDEO_JOB_FAILED', message: 'Không thể hoàn tất xử lý video. Hệ thống sẽ thử lại.', retryable: true });
}

async function obtainTranscript(job, dependencies) {
  const { repository, inspect, ai, signal } = dependencies;
  if (job.transcript) return transcriptSchema.parse(job.transcript);
  await repository.updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { stage: 'VALIDATING_VIDEO' } });
  const metadata = await inspect({ videoId: job.videoId, videoUrl: job.videoUrl, signal });
  signal.throwIfAborted();
  await repository.updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { metadata, stage: 'FETCHING_AUDIO' } });
  const onStage = async (stage) => {
    signal.throwIfAborted();
    await repository.updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { stage } });
  };
  const transcript = transcriptSchema.parse(await ai.transcribe({ job, onStage, signal }));
  signal.throwIfAborted();
  await repository.updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { transcript, stage: 'SUMMARIZING' } });
  return transcript;
}

async function executeJob(job, dependencies) {
  const { repository, ai, signal } = dependencies;
  signal.throwIfAborted();
  const transcript = await obtainTranscript(job, dependencies);
  await repository.updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { stage: 'SUMMARIZING' } });
  const recipe = validateVideoRecipe({ recipe: await ai.summarize({ job, transcript, signal }), transcript });
  signal.throwIfAborted();
  await repository.updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { stage: 'SAVING_RESULT' } });
  const summary = await repository.complete({ job, recipe });
  return { status: 'COMPLETED', summaryId: summary.id };
}

export async function processVideoRecipeSummaryJob(job, options = {}) {
  const dependencies = { repository: videoRecipeSummaryJobRepository, inspect: (source) => youtubeMetadataService.inspect(source),
    ai: videoRecipeSummaryAiService, signal: new AbortController().signal, config: videoRecipeSummaryConfig, ...options };
  try { return await executeJob(job, dependencies); }
  catch (failure) {
    const error = safeFailure(failure, dependencies.signal);
    if (error.errorCode === 'VIDEO_JOB_LEASE_LOST') throw error;
    await dependencies.repository.fail({ job, error, config: dependencies.config });
    const retry = error.retryable && job.attempt < dependencies.config.maxAttempts;
    return { status: retry ? 'RETRY_SCHEDULED' : 'FAILED', errorCode: error.errorCode };
  }
}
