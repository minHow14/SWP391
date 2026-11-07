// D:/SWP391/SWP391/server/src/services/contentModerationProcessor.js
import { contentModerationConfig } from '../config/contentModerationConfig.js';
import { MODERATION_IMAGE_UNREADABLE } from '../constants/contentModeration.js';
import { contentModerationRepository } from '../repositories/contentModerationRepository.js';
import { contentModerationAiService, contentModerationError } from './contentModerationAiService.js';
import { contentModerationService } from './contentModerationService.js';
import { loadModerationImage } from './moderationImageLoader.js';
import { validateContentModerationResult } from '../validators/contentModerationValidator.js';

const UNREADABLE_IMAGE_REASON = 'Không đọc được ảnh để kiểm duyệt tự động. Quản trị viên cần xem trực tiếp ảnh này.';

async function moderateImage({ ai, job, imageUrl, imageIndex, signal, loadImage }) {
  let image;
  try { image = await loadImage(imageUrl); } catch (error) {
    if (error.errorCode !== MODERATION_IMAGE_UNREADABLE) throw error;
    // A missing or corrupt file cannot be cleared automatically, so it goes to an administrator.
    return { imageUrl, decision: 'REVIEW', reason: UNREADABLE_IMAGE_REASON, categories: [], observations: [], errorCode: error.errorCode };
  }
  const { decision, reason, categories, observations } = await ai.moderateImage({ job, imageIndex, image, signal });
  return { imageUrl, decision, reason, categories, observations, errorCode: null };
}

export function mergeModerationResults(textResult, imageFindings) {
  // Text-only jobs (every comment) keep the original result shape.
  if (!imageFindings.length) return textResult;
  const flagged = imageFindings.map((finding, index) => ({ ...finding, position: index + 1 }))
    .filter((finding) => finding.decision === 'REVIEW');
  if (!flagged.length) return { ...textResult, imageFindings };
  const categories = [...new Set([...textResult.categories, ...flagged.flatMap((finding) => finding.categories)])];
  const reason = textResult.decision === 'REVIEW' ? textResult.reason
    : flagged.map((finding) => `Ảnh ${finding.position}: ${finding.reason}`).join(' ');
  return { ...textResult, decision: 'REVIEW', reason: reason.slice(0, 2_000), categories, imageFindings };
}

async function moderateJob({ job, ai, signal, loadImage }) {
  const imageUrls = job.imageUrls ?? [];
  const [textResult, ...imageFindings] = await Promise.all([
    ai.moderate({ job, signal }).then((result) => validateContentModerationResult(result, job)),
    ...imageUrls.map((imageUrl, imageIndex) => moderateImage({ ai, job, imageUrl, imageIndex, signal, loadImage })),
  ]);
  return mergeModerationResults(textResult, imageFindings);
}

export async function processContentModerationJob(job, options = {}) {
  const { repository = contentModerationRepository, ai = contentModerationAiService, config = contentModerationConfig,
    signal = new AbortController().signal, loadImage = loadModerationImage } = options;
  try {
    signal.throwIfAborted();
    const result = await moderateJob({ job, ai, signal, loadImage });
    signal.throwIfAborted();
    return await contentModerationService.complete({ job, result }, repository);
  } catch (failure) {
    if (failure.errorCode === 'MODERATION_LEASE_LOST') throw failure;
    const error = failure.errorCode ? failure : contentModerationError({
      code: signal.aborted ? 'MODERATION_INTERRUPTED' : 'MODERATION_JOB_FAILED', retryable: true });
    return contentModerationService.fail({ job, error, config }, repository);
  }
}
