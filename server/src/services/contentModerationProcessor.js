// D:/SWP391/SWP391/server/src/services/contentModerationProcessor.js
import { contentModerationConfig } from '../config/contentModerationConfig.js';
import { contentModerationRepository } from '../repositories/contentModerationRepository.js';
import { contentModerationAiService, contentModerationError } from './contentModerationAiService.js';
import { contentModerationService } from './contentModerationService.js';
import { validateContentModerationResult } from '../validators/contentModerationValidator.js';

export async function processContentModerationJob(job, options = {}) {
  const { repository = contentModerationRepository, ai = contentModerationAiService,
    config = contentModerationConfig, signal = new AbortController().signal } = options;
  try {
    signal.throwIfAborted();
    const result = validateContentModerationResult(await ai.moderate({ job, signal }), job);
    signal.throwIfAborted();
    return await contentModerationService.complete({ job, result }, repository);
  } catch (failure) {
    if (failure.errorCode === 'MODERATION_LEASE_LOST') throw failure;
    const error = failure.errorCode ? failure : contentModerationError({
      code: signal.aborted ? 'MODERATION_INTERRUPTED' : 'MODERATION_JOB_FAILED', retryable: true });
    return contentModerationService.fail({ job, error, config }, repository);
  }
}
