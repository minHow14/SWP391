// D:/SWP391/SWP391/server/src/services/videoRecipeSummaryProcessor.js
// Worker xử lý job tóm tắt công thức từ video YouTube: kiểm tra video, lấy transcript, tóm tắt bằng AI và lưu kết quả.
import { videoRecipeSummaryJobRepository } from '../repositories/videoRecipeSummaryJobRepository.js';
import { videoRecipeSummaryAiService } from './videoRecipeSummaryAiService.js';
import { youtubeMetadataService } from './youtubeMetadataService.js';
import { videoRecipeSummaryConfig } from '../config/videoRecipeSummaryConfig.js';
import { validateCompleteVideoTranscript, validateVideoRecipe } from '../validators/videoRecipeSummaryValidator.js';
import { videoRecipeSummaryError } from '../utils/videoRecipeSummaryError.js';

// Chuẩn hóa lỗi khi xử lý job: lỗi output AI sai schema không thử lại, lỗi không rõ nguyên nhân được đánh dấu retryable.
function safeFailure(error, signal) {
  // Bị hủy có chủ đích (hết lease, tắt worker) thì ưu tiên lý do hủy gốc.
  if (signal.aborted && signal.reason?.errorCode) return signal.reason;
  if (error.errorCode) return error;
  if (error.name === 'ZodError') return videoRecipeSummaryError({ status: 502, code: 'VIDEO_AI_INVALID_OUTPUT', message: 'Nội dung nhận dạng hoặc công thức không hợp lệ.' });
  return videoRecipeSummaryError({ status: 503, code: 'VIDEO_JOB_FAILED', message: 'Không thể hoàn tất xử lý video. Hệ thống sẽ thử lại.', retryable: true });
}

// Lấy transcript của video; cập nhật stage sau từng bước để FE hiển thị tiến trình.
async function obtainTranscript(job, dependencies) {
  const { repository, inspect, ai, signal } = dependencies;
  // Lần thử lại có transcript đã lưu thì dùng lại, không gọi AI nhận dạng lần nữa để tiết kiệm chi phí.
  if (job.transcript) return validateCompleteVideoTranscript({ transcript: job.transcript, metadata: job.metadata, videoId: job.videoId });
  await repository.updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { stage: 'VALIDATING_VIDEO' } });
  const metadata = await inspect({ videoId: job.videoId, videoUrl: job.videoUrl, signal });
  // Kiểm tra hủy sau mỗi bước chậm để không ghi tiếp khi worker đã mất quyền giữ job.
  signal.throwIfAborted();
  await repository.updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { metadata, stage: 'FETCHING_CAPTIONS' } });
  const onStage = async (stage) => {
    signal.throwIfAborted();
    await repository.updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { stage } });
  };
  const transcript = validateCompleteVideoTranscript({ transcript: await ai.transcribe({ job, metadata, onStage, signal }), metadata, videoId: job.videoId });
  signal.throwIfAborted();
  await repository.updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { transcript, stage: 'SUMMARIZING' } });
  return transcript;
}

// Chạy toàn bộ pipeline của một job: transcript -> tóm tắt -> lưu công thức.
async function executeJob(job, dependencies) {
  const { repository, ai, signal } = dependencies;
  signal.throwIfAborted();
  const transcript = await obtainTranscript(job, dependencies);
  await repository.updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { stage: 'SUMMARIZING' } });
  // Công thức được kiểm tra đối chiếu với transcript để hạn chế AI bịa nội dung.
  const recipe = validateVideoRecipe({ recipe: await ai.summarize({ job, transcript, signal }), transcript });
  signal.throwIfAborted();
  await repository.updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { stage: 'SAVING_RESULT' } });
  const summary = await repository.complete({ job, recipe });
  return { status: 'COMPLETED', summaryId: summary.id };
}

// Điểm vào của worker; `options` cho phép inject phụ thuộc (repository, AI, signal...) khi test.
export async function processVideoRecipeSummaryJob(job, options = {}) {
  const dependencies = { repository: videoRecipeSummaryJobRepository, inspect: (source) => youtubeMetadataService.inspect(source),
    ai: videoRecipeSummaryAiService, signal: new AbortController().signal, config: videoRecipeSummaryConfig, ...options };
  try { return await executeJob(job, dependencies); }
  catch (failure) {
    const error = safeFailure(failure, dependencies.signal);
    // Mất lease nghĩa là worker khác đang giữ job; không được ghi trạng thái thất bại đè lên.
    if (error.errorCode === 'VIDEO_JOB_LEASE_LOST') throw error;
    await dependencies.repository.fail({ job, error, config: dependencies.config });
    // Chỉ lên lịch thử lại khi lỗi cho phép và còn lượt thử.
    const retry = error.retryable && job.attempt < dependencies.config.maxAttempts;
    return { status: retry ? 'RETRY_SCHEDULED' : 'FAILED', errorCode: error.errorCode };
  }
}
