// server/tests/videoRecipeSummaryProcessor.test.js
import { describe, expect, it, vi } from 'vitest';
import { processVideoRecipeSummaryJob } from '../src/services/videoRecipeSummaryProcessor.js';

const JOB = { id: 'job-fixture', userId: 1, videoId: 'AbCdEfGhI12', videoUrl: 'https://www.youtube.com/watch?v=AbCdEfGhI12',
  leaseToken: 'lease-fixture', attempt: 1, transcript: null };
const TRANSCRIPT = { language: 'vi', durationSeconds: 60, segments: [{ startSeconds: 0, endSeconds: 60, text: 'Xào nấm chín.' }] };
const RECIPE = { title: 'Nấm xào', ingredients: [], steps: [{ instruction: 'Xào nấm chín.', sourceSegmentIndexes: [0] }] };
const METADATA = { videoId: JOB.videoId, title: 'Video fixture', durationSeconds: 60 };
function dependencies() {
  return { repository: { updateLeased: vi.fn(), complete: vi.fn().mockResolvedValue({ id: 'summary-fixture' }), fail: vi.fn() },
    inspect: vi.fn().mockResolvedValue(METADATA),
    ai: { transcribe: vi.fn().mockResolvedValue(TRANSCRIPT), summarize: vi.fn().mockResolvedValue(RECIPE) },
    signal: new AbortController().signal, config: { maxAttempts: 3, retryMs: 30_000 } };
}

describe('video recipe job processor', () => {
  it('validates before AI, saves the transcript before summarizing, and completes last', async () => {
    const deps = dependencies();
    deps.ai.summarize.mockImplementation(async () => {
      expect(deps.repository.updateLeased).toHaveBeenCalledWith(expect.objectContaining({ data: { transcript: TRANSCRIPT, stage: 'SUMMARIZING' } }));
      return RECIPE;
    });
    expect(await processVideoRecipeSummaryJob(JOB, deps)).toMatchObject({ status: 'COMPLETED', summaryId: 'summary-fixture' });
    expect(deps.inspect.mock.invocationCallOrder[0]).toBeLessThan(deps.ai.transcribe.mock.invocationCallOrder[0]);
    expect(deps.repository.complete).toHaveBeenCalledWith({ job: JOB, recipe: RECIPE });
    expect(deps.repository.fail).not.toHaveBeenCalled();
  });
  it('never invokes AI when metadata validation fails', async () => {
    const deps = dependencies();
    deps.inspect.mockRejectedValue(Object.assign(new Error('Video cần không quá 11 phút.'), { errorCode: 'VIDEO_TOO_LONG' }));
    expect(await processVideoRecipeSummaryJob(JOB, deps)).toMatchObject({ status: 'FAILED', errorCode: 'VIDEO_TOO_LONG' });
    expect(deps.ai.transcribe).not.toHaveBeenCalled();
    expect(deps.ai.summarize).not.toHaveBeenCalled();
  });
  it('resumes from a complete transcript without calling Groq again', async () => {
    const deps = dependencies();
    expect(await processVideoRecipeSummaryJob({ ...JOB, transcript: TRANSCRIPT, metadata: METADATA }, deps)).toHaveProperty('status', 'COMPLETED');
    expect(deps.inspect).not.toHaveBeenCalled();
    expect(deps.ai.transcribe).not.toHaveBeenCalled();
    expect(deps.ai.summarize).toHaveBeenCalledOnce();
  });
  it('does not summarize incomplete or overlong transcripts', async () => {
    for (const transcript of [{ ...TRANSCRIPT, segments: [] }, { ...TRANSCRIPT, durationSeconds: 661 }]) {
      const deps = dependencies();
      deps.ai.transcribe.mockResolvedValue(transcript);
      expect(await processVideoRecipeSummaryJob(JOB, deps)).toHaveProperty('status', 'FAILED');
      expect(deps.ai.summarize).not.toHaveBeenCalled();
      expect(deps.repository.complete).not.toHaveBeenCalled();
    }
  });
  it('rejects truncated audio before saving a complete transcript checkpoint', async () => {
    const deps = dependencies();
    deps.inspect.mockResolvedValue({ ...METADATA, durationSeconds: 600 });
    deps.ai.transcribe.mockResolvedValue({ ...TRANSCRIPT, durationSeconds: 5, segments: [{ startSeconds: 0, endSeconds: 5, text: 'Một đoạn bị cắt.' }] });
    const result = await processVideoRecipeSummaryJob(JOB, deps);
    expect(result).toMatchObject({ status: 'FAILED', errorCode: 'VIDEO_TRANSCRIPT_INCOMPLETE' });
    expect(deps.ai.summarize).not.toHaveBeenCalled();
    expect(deps.repository.updateLeased.mock.calls.some(([input]) => input.data.transcript)).toBe(false);
  });
  it('revalidates source duration and metadata on resumed checkpoints', async () => {
    for (const metadata of [{ ...METADATA, durationSeconds: 600 }, null]) {
      const deps = dependencies();
      expect(await processVideoRecipeSummaryJob({ ...JOB, transcript: TRANSCRIPT, metadata }, deps)).toHaveProperty('status', 'FAILED');
      expect(deps.ai.summarize).not.toHaveBeenCalled();
      expect(deps.ai.transcribe).not.toHaveBeenCalled();
    }
  });
  it('allows trailing silence and a two-second codec duration difference', async () => {
    const deps = dependencies();
    deps.ai.transcribe.mockResolvedValue({ ...TRANSCRIPT, durationSeconds: 58, segments: [{ ...TRANSCRIPT.segments[0], endSeconds: 30 }] });
    expect(await processVideoRecipeSummaryJob(JOB, deps)).toHaveProperty('status', 'COMPLETED');
  });
  it('persists actual transcription stage updates with the lease token', async () => {
    const deps = dependencies();
    deps.ai.transcribe.mockImplementation(async ({ onStage }) => { await onStage('TRANSCRIBING'); return TRANSCRIPT; });
    await processVideoRecipeSummaryJob(JOB, deps);
    expect(deps.repository.updateLeased).toHaveBeenCalledWith({ id: JOB.id, leaseToken: JOB.leaseToken, data: { stage: 'TRANSCRIBING' } });
  });
  it('rejects recipes referring to absent source segments', async () => {
    const deps = dependencies();
    deps.ai.summarize.mockResolvedValue({ ...RECIPE, steps: [{ instruction: 'Không có nguồn', sourceSegmentIndexes: [99] }] });
    expect(await processVideoRecipeSummaryJob(JOB, deps)).toHaveProperty('status', 'FAILED');
    expect(deps.repository.complete).not.toHaveBeenCalled();
  });
  it('schedules provider rate-limit retries with their delay', async () => {
    const deps = dependencies();
    const error = Object.assign(new Error('Hết hạn mức.'), { errorCode: 'VIDEO_AI_RATE_LIMITED', retryable: true, retryAfterMs: 60_000 });
    deps.ai.summarize.mockRejectedValue(error);
    expect(await processVideoRecipeSummaryJob(JOB, deps)).toHaveProperty('status', 'RETRY_SCHEDULED');
    expect(deps.repository.fail).toHaveBeenCalledWith({ job: JOB, error, config: deps.config });
    expect(await processVideoRecipeSummaryJob({ ...JOB, attempt: 3 }, deps)).toHaveProperty('status', 'FAILED');
  });
  it('does not mark an unsaved result completed', async () => {
    const deps = dependencies();
    deps.repository.complete.mockRejectedValue(new Error('PRIVATE_DATABASE_DETAIL'));
    const result = await processVideoRecipeSummaryJob(JOB, deps);
    expect(result.status).not.toBe('COMPLETED');
    expect(deps.repository.fail.mock.calls[0][0].error.message).not.toContain('PRIVATE_DATABASE_DETAIL');
  });
  it('stops without mutating another worker job after losing its lease', async () => {
    const deps = dependencies();
    deps.repository.updateLeased.mockRejectedValue(Object.assign(new Error('Lease lost'), { errorCode: 'VIDEO_JOB_LEASE_LOST' }));
    await expect(processVideoRecipeSummaryJob(JOB, deps)).rejects.toHaveProperty('errorCode', 'VIDEO_JOB_LEASE_LOST');
    expect(deps.repository.fail).not.toHaveBeenCalled();
    expect(deps.ai.transcribe).not.toHaveBeenCalled();
  });
});
