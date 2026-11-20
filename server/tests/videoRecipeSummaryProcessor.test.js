// D:/SWP391/SWP391/server/tests/videoRecipeSummaryProcessor.test.js
// Kiểm thử bộ xử lý job tóm tắt công thức video: thứ tự kiểm tra, checkpoint transcript, retry và an toàn lease.
import { describe, expect, it, vi } from 'vitest';
import { processVideoRecipeSummaryJob } from '../src/services/videoRecipeSummaryProcessor.js';

// Dữ liệu mẫu job, transcript, công thức và metadata dùng chung.
const JOB = { id: 'job-fixture', userId: 1, videoId: 'AbCdEfGhI12', videoUrl: 'https://www.youtube.com/watch?v=AbCdEfGhI12',
  leaseToken: 'lease-fixture', attempt: 1, transcript: null };
const TRANSCRIPT = { language: 'vi', durationSeconds: 60, segments: [{ startSeconds: 0, endSeconds: 60, text: 'Xào nấm chín.' }] };
const RECIPE = { title: 'Nấm xào', ingredients: [], steps: [{ instruction: 'Xào nấm chín.', sourceSegmentIndexes: [0] }] };
const METADATA = { videoId: JOB.videoId, title: 'Video fixture', durationSeconds: 60 };
// Tạo bộ phụ thuộc giả (repository, inspect metadata, AI, signal, config) cho processor.
function dependencies() {
  return { repository: { updateLeased: vi.fn(), complete: vi.fn().mockResolvedValue({ id: 'summary-fixture' }), fail: vi.fn() },
    inspect: vi.fn().mockResolvedValue(METADATA),
    ai: { transcribe: vi.fn().mockResolvedValue(TRANSCRIPT), summarize: vi.fn().mockResolvedValue(RECIPE) },
    signal: new AbortController().signal, config: { maxAttempts: 3, retryMs: 30_000 } };
}

// Nhóm test: bộ xử lý job tóm tắt video.
describe('video recipe job processor', () => {
  // Phải kiểm tra metadata trước khi gọi AI, lưu transcript trước khi tóm tắt và chỉ đánh dấu hoàn tất ở bước cuối.
  it('validates before AI, saves the transcript before summarizing, and completes last', async () => {
    const deps = dependencies();
    deps.ai.summarize.mockImplementation(async () => {
      expect(deps.repository.updateLeased).toHaveBeenCalledWith(expect.objectContaining({ data: { transcript: TRANSCRIPT, stage: 'SUMMARIZING' } }));
      return RECIPE;
    });
    expect(await processVideoRecipeSummaryJob(JOB, deps)).toMatchObject({ status: 'COMPLETED', summaryId: 'summary-fixture' });
    expect(deps.inspect.mock.invocationCallOrder[0]).toBeLessThan(deps.ai.transcribe.mock.invocationCallOrder[0]);
    expect(deps.ai.transcribe).toHaveBeenCalledWith({ job: JOB, metadata: METADATA, onStage: expect.any(Function), signal: deps.signal });
    expect(deps.repository.updateLeased).toHaveBeenCalledWith({ id: JOB.id, leaseToken: JOB.leaseToken,
      data: { metadata: METADATA, stage: 'FETCHING_CAPTIONS' } });
    expect(deps.repository.complete).toHaveBeenCalledWith({ job: JOB, recipe: RECIPE });
    expect(deps.repository.fail).not.toHaveBeenCalled();
  });
  // Metadata không hợp lệ (video quá dài) thì không bao giờ gọi AI để tránh tốn chi phí.
  it('never invokes AI when metadata validation fails', async () => {
    const deps = dependencies();
    deps.inspect.mockRejectedValue(Object.assign(new Error('Video cần không quá 11 phút.'), { errorCode: 'VIDEO_TOO_LONG' }));
    expect(await processVideoRecipeSummaryJob(JOB, deps)).toMatchObject({ status: 'FAILED', errorCode: 'VIDEO_TOO_LONG' });
    expect(deps.ai.transcribe).not.toHaveBeenCalled();
    expect(deps.ai.summarize).not.toHaveBeenCalled();
  });
  // Job đã có transcript đầy đủ được tiếp tục từ checkpoint, không lấy lại phụ đề.
  it('resumes from a complete transcript without fetching captions again', async () => {
    const deps = dependencies();
    expect(await processVideoRecipeSummaryJob({ ...JOB, transcript: TRANSCRIPT, metadata: METADATA }, deps)).toHaveProperty('status', 'COMPLETED');
    expect(deps.inspect).not.toHaveBeenCalled();
    expect(deps.ai.transcribe).not.toHaveBeenCalled();
    expect(deps.ai.summarize).toHaveBeenCalledOnce();
  });
  // Transcript rỗng hoặc dài quá giới hạn không được đem đi tóm tắt.
  it('does not summarize incomplete or overlong transcripts', async () => {
    for (const transcript of [{ ...TRANSCRIPT, segments: [] }, { ...TRANSCRIPT, durationSeconds: 661 }]) {
      const deps = dependencies();
      deps.ai.transcribe.mockResolvedValue(transcript);
      expect(await processVideoRecipeSummaryJob(JOB, deps)).toHaveProperty('status', 'FAILED');
      expect(deps.ai.summarize).not.toHaveBeenCalled();
      expect(deps.repository.complete).not.toHaveBeenCalled();
    }
  });
  // Transcript báo thời lượng bằng thời điểm phụ đề cuối (bị cắt) thay vì toàn bộ video phải bị coi là không đầy đủ và không được lưu.
  it('rejects a transcript reporting the last caption time instead of the full video duration', async () => {
    const deps = dependencies();
    deps.inspect.mockResolvedValue({ ...METADATA, durationSeconds: 600 });
    deps.ai.transcribe.mockResolvedValue({ ...TRANSCRIPT, durationSeconds: 5, segments: [{ startSeconds: 0, endSeconds: 5, text: 'Một đoạn bị cắt.' }] });
    const result = await processVideoRecipeSummaryJob(JOB, deps);
    expect(result).toMatchObject({ status: 'FAILED', errorCode: 'VIDEO_TRANSCRIPT_INCOMPLETE' });
    expect(deps.ai.summarize).not.toHaveBeenCalled();
    expect(deps.repository.updateLeased.mock.calls.some(([input]) => input.data.transcript)).toBe(false);
  });
  // Khi tiếp tục từ checkpoint vẫn phải kiểm tra lại thời lượng và metadata nguồn.
  it('revalidates source duration and metadata on resumed checkpoints', async () => {
    for (const metadata of [{ ...METADATA, durationSeconds: 600 }, null]) {
      const deps = dependencies();
      expect(await processVideoRecipeSummaryJob({ ...JOB, transcript: TRANSCRIPT, metadata }, deps)).toHaveProperty('status', 'FAILED');
      expect(deps.ai.summarize).not.toHaveBeenCalled();
      expect(deps.ai.transcribe).not.toHaveBeenCalled();
    }
  });
  // Cho phép im lặng ở cuối video và sai lệch thời lượng 2 giây do codec.
  it('allows trailing silence and a two-second codec duration difference', async () => {
    const deps = dependencies();
    deps.ai.transcribe.mockResolvedValue({ ...TRANSCRIPT, durationSeconds: 58, segments: [{ ...TRANSCRIPT.segments[0], endSeconds: 30 }] });
    expect(await processVideoRecipeSummaryJob(JOB, deps)).toHaveProperty('status', 'COMPLETED');
  });
  // Cập nhật giai đoạn lấy phụ đề phải được lưu kèm lease token.
  it('persists actual caption stage updates with the lease token', async () => {
    const deps = dependencies();
    deps.ai.transcribe.mockImplementation(async ({ onStage }) => { await onStage('FETCHING_CAPTIONS'); return TRANSCRIPT; });
    await processVideoRecipeSummaryJob(JOB, deps);
    expect(deps.repository.updateLeased).toHaveBeenCalledWith({ id: JOB.id, leaseToken: JOB.leaseToken, data: { stage: 'FETCHING_CAPTIONS' } });
  });
  // Thiếu phụ đề tiếng Việt thì job thất bại, không tóm tắt và không lưu công thức.
  it('fails without summarizing or saving a recipe when Vietnamese captions are missing', async () => {
    const deps = dependencies();
    const error = Object.assign(new Error('Video chưa có phụ đề phù hợp'), { errorCode: 'VIDEO_CAPTIONS_UNAVAILABLE', retryable: false });
    deps.ai.transcribe.mockRejectedValue(error);
    expect(await processVideoRecipeSummaryJob(JOB, deps)).toMatchObject({ status: 'FAILED', errorCode: 'VIDEO_CAPTIONS_UNAVAILABLE' });
    expect(deps.repository.fail).toHaveBeenCalledWith({ job: JOB, error, config: deps.config });
    expect(deps.ai.summarize).not.toHaveBeenCalled();
    expect(deps.repository.complete).not.toHaveBeenCalled();
  });
  // Công thức tham chiếu đoạn transcript không tồn tại bị từ chối (chống AI bịa nội dung).
  it('rejects recipes referring to absent source segments', async () => {
    const deps = dependencies();
    deps.ai.summarize.mockResolvedValue({ ...RECIPE, steps: [{ instruction: 'Không có nguồn', sourceSegmentIndexes: [99] }] });
    expect(await processVideoRecipeSummaryJob(JOB, deps)).toHaveProperty('status', 'FAILED');
    expect(deps.repository.complete).not.toHaveBeenCalled();
  });
  // Bị giới hạn tốc độ thì lên lịch thử lại theo độ trễ; hết lượt thử thì FAILED.
  it('schedules provider rate-limit retries with their delay', async () => {
    const deps = dependencies();
    const error = Object.assign(new Error('Hết hạn mức.'), { errorCode: 'VIDEO_AI_RATE_LIMITED', retryable: true, retryAfterMs: 60_000 });
    deps.ai.summarize.mockRejectedValue(error);
    expect(await processVideoRecipeSummaryJob(JOB, deps)).toHaveProperty('status', 'RETRY_SCHEDULED');
    expect(deps.repository.fail).toHaveBeenCalledWith({ job: JOB, error, config: deps.config });
    expect(await processVideoRecipeSummaryJob({ ...JOB, attempt: 3 }, deps)).toHaveProperty('status', 'FAILED');
  });
  // Lưu kết quả thất bại thì không đánh dấu hoàn tất và không lộ chi tiết lỗi DB.
  it('does not mark an unsaved result completed', async () => {
    const deps = dependencies();
    deps.repository.complete.mockRejectedValue(new Error('PRIVATE_DATABASE_DETAIL'));
    const result = await processVideoRecipeSummaryJob(JOB, deps);
    expect(result.status).not.toBe('COMPLETED');
    expect(deps.repository.fail.mock.calls[0][0].error.message).not.toContain('PRIVATE_DATABASE_DETAIL');
  });
  // Mất lease thì dừng ngay, không ghi đè job mà worker khác đang giữ.
  it('stops without mutating another worker job after losing its lease', async () => {
    const deps = dependencies();
    deps.repository.updateLeased.mockRejectedValue(Object.assign(new Error('Lease lost'), { errorCode: 'VIDEO_JOB_LEASE_LOST' }));
    await expect(processVideoRecipeSummaryJob(JOB, deps)).rejects.toHaveProperty('errorCode', 'VIDEO_JOB_LEASE_LOST');
    expect(deps.repository.fail).not.toHaveBeenCalled();
    expect(deps.ai.transcribe).not.toHaveBeenCalled();
  });
});
