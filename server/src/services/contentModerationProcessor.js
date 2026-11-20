// D:/SWP391/SWP391/server/src/services/contentModerationProcessor.js
// Worker xử lý job kiểm duyệt nội dung bằng AI: kiểm duyệt văn bản và từng ảnh đính kèm rồi gộp kết quả.
import { contentModerationConfig } from '../config/contentModerationConfig.js';
import { MODERATION_IMAGE_UNREADABLE } from '../constants/contentModeration.js';
import { contentModerationRepository } from '../repositories/contentModerationRepository.js';
import { contentModerationAiService, contentModerationError } from './contentModerationAiService.js';
import { contentModerationService } from './contentModerationService.js';
import { loadModerationImage } from './moderationImageLoader.js';
import { validateContentModerationResult } from '../validators/contentModerationValidator.js';

// Lý do hiển thị cho admin khi ảnh không đọc được và phải duyệt thủ công.
const UNREADABLE_IMAGE_REASON = 'Không đọc được ảnh để kiểm duyệt tự động. Quản trị viên cần xem trực tiếp ảnh này.';

// Kiểm duyệt một ảnh; ảnh không đọc được thì chuyển sang REVIEW thay vì để job thất bại.
async function moderateImage({ ai, job, imageUrl, imageIndex, signal, loadImage }) {
  let image;
  try { image = await loadImage(imageUrl); } catch (error) {
    if (error.errorCode !== MODERATION_IMAGE_UNREADABLE) throw error;
    // Tệp bị thiếu hoặc hỏng không thể tự động cho qua, nên chuyển cho quản trị viên xem xét.
    return { imageUrl, decision: 'REVIEW', reason: UNREADABLE_IMAGE_REASON, categories: [], observations: [], errorCode: error.errorCode };
  }
  const { decision, reason, categories, observations } = await ai.moderateImage({ job, imageIndex, image, signal });
  return { imageUrl, decision, reason, categories, observations, errorCode: null };
}

// Gộp kết quả văn bản và ảnh: chỉ cần một ảnh bị gắn cờ REVIEW thì cả nội dung chuyển sang REVIEW.
export function mergeModerationResults(textResult, imageFindings) {
  // Job chỉ có văn bản (mọi bình luận) giữ nguyên định dạng kết quả gốc.
  if (!imageFindings.length) return textResult;
  const flagged = imageFindings.map((finding, index) => ({ ...finding, position: index + 1 }))
    .filter((finding) => finding.decision === 'REVIEW');
  if (!flagged.length) return { ...textResult, imageFindings };
  const categories = [...new Set([...textResult.categories, ...flagged.flatMap((finding) => finding.categories)])];
  // Ưu tiên lý do từ phần văn bản; nếu văn bản sạch thì ghép lý do từ các ảnh bị gắn cờ.
  const reason = textResult.decision === 'REVIEW' ? textResult.reason
    : flagged.map((finding) => `Ảnh ${finding.position}: ${finding.reason}`).join(' ');
  // Cắt lý do 2000 ký tự cho vừa giới hạn lưu trữ.
  return { ...textResult, decision: 'REVIEW', reason: reason.slice(0, 2_000), categories, imageFindings };
}

// Kiểm duyệt văn bản và tất cả ảnh song song để giảm thời gian chờ.
async function moderateJob({ job, ai, signal, loadImage }) {
  const imageUrls = job.imageUrls ?? [];
  const [textResult, ...imageFindings] = await Promise.all([
    ai.moderate({ job, signal }).then((result) => validateContentModerationResult(result, job)),
    ...imageUrls.map((imageUrl, imageIndex) => moderateImage({ ai, job, imageUrl, imageIndex, signal, loadImage })),
  ]);
  return mergeModerationResults(textResult, imageFindings);
}

// Điểm vào của worker kiểm duyệt; `options` cho phép inject phụ thuộc khi test.
export async function processContentModerationJob(job, options = {}) {
  const { repository = contentModerationRepository, ai = contentModerationAiService, config = contentModerationConfig,
    signal = new AbortController().signal, loadImage = loadModerationImage } = options;
  try {
    signal.throwIfAborted();
    const result = await moderateJob({ job, ai, signal, loadImage });
    signal.throwIfAborted();
    return await contentModerationService.complete({ job, result }, repository);
  } catch (failure) {
    // Mất lease nghĩa là worker khác đã nhận job; ném tiếp để không ghi đè kết quả của worker đó.
    if (failure.errorCode === 'MODERATION_LEASE_LOST') throw failure;
    // Lỗi không có errorCode được coi là lỗi tạm thời và cho phép thử lại.
    const error = failure.errorCode ? failure : contentModerationError({
      code: signal.aborted ? 'MODERATION_INTERRUPTED' : 'MODERATION_JOB_FAILED', retryable: true });
    return contentModerationService.fail({ job, error, config }, repository);
  }
}
