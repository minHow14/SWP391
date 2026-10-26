// D:/SWP391/SWP391/server/tests/videoRecipeSummaryAi.test.js
import { describe, expect, it, vi } from 'vitest';
import { createVideoRecipeSummaryAiService } from '../src/services/videoRecipeSummaryAiService.js';

const JOB = { id: 'job-fixture', videoId: 'AbCdEfGhI12', videoUrl: 'https://www.youtube.com/watch?v=AbCdEfGhI12' };
const TRANSCRIPT = { language: 'vi', durationSeconds: 1, segments: [{ startSeconds: 0, endSeconds: 1, text: 'Xào nấm.' }] };
const CONFIG = { url: 'http://127.0.0.1:8000', internalApiKey: 'unit-test-internal-key' };
const events = (items) => new Response(items.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join(''), { headers: { 'Content-Type': 'text/event-stream' } });
const service = (fetchImpl, extra = {}) => createVideoRecipeSummaryAiService({ fetchImpl, config: CONFIG, ...extra });

describe('video recipe internal AI transport', () => {
  it('sends the canonical source, chosen model and internal key and consumes stage events', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(events([
      ['progress', { stage: 'FETCHING_AUDIO' }], ['progress', { stage: 'TRANSCRIBING' }], ['done', { success: true, data: { transcript: TRANSCRIPT } }],
    ]));
    const onStage = vi.fn();
    expect(await service(fetchImpl).transcribe({ job: JOB, onStage })).toEqual(TRANSCRIPT);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${CONFIG.url}/api/video-recipe-transcriptions/stream`);
    expect(options.headers['X-Internal-Api-Key']).toBe(CONFIG.internalApiKey);
    expect(options.redirect).toBe('error');
    expect(JSON.parse(options.body)).toMatchObject({ videoId: JOB.videoId, model: 'whisper-large-v3', language: 'vi', maxDurationSeconds: 660 });
    expect(onStage.mock.calls.map(([stage]) => stage)).toEqual(['FETCHING_AUDIO', 'TRANSCRIBING']);
  });
  it('rejects missing completion, missing stage, invalid stage and upstream error events', async () => {
    for (const items of [[], [['progress', { stage: 'SUMMARIZING' }]], [['done', { success: true, data: { transcript: TRANSCRIPT } }]],
      [['error', { errorCode: 'PRIVATE_PROVIDER_FAILURE', message: 'SECRET' }]]]) {
      await expect(service(vi.fn().mockResolvedValue(events(items))).transcribe({ job: JOB, onStage: vi.fn() })).rejects.toHaveProperty('errorCode');
    }
  });
  it('honors Retry-After and hides provider error messages', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('PRIVATE_PROVIDER_DETAIL', { status: 429, headers: { 'Retry-After': '60' } }));
    await expect(service(fetchImpl).summarize({ job: JOB, transcript: TRANSCRIPT })).rejects.toMatchObject({
      errorCode: 'VIDEO_AI_RATE_LIMITED', retryable: true, retryAfterMs: 60_000,
    });
  });
  it.each([401, 403, 404])('maps unavailable internal endpoint %s to an explicit service error', async (status) => {
    const client = service(vi.fn().mockResolvedValue(new Response('SECRET', { status })));
    await expect(client.summarize({ job: JOB, transcript: TRANSCRIPT })).rejects.toHaveProperty('statusCode', 503);
  });
  it('bounds total upstream response size', async () => {
    const response = new Response('x'.repeat(1_048_577), { headers: { 'Content-Type': 'application/json' } });
    await expect(service(vi.fn().mockResolvedValue(response)).summarize({ job: JOB, transcript: TRANSCRIPT })).rejects.toHaveProperty('errorCode', 'VIDEO_AI_INVALID_OUTPUT');
  });
  it('cancels a stalled response body on timeout', async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }), { headers: { 'Content-Type': 'application/json' } });
    await expect(service(vi.fn().mockResolvedValue(response), { timeoutMs: 20 }).summarize({ job: JOB, transcript: TRANSCRIPT })).rejects.toHaveProperty('errorCode', 'VIDEO_AI_TIMEOUT');
    expect(cancel).toHaveBeenCalled();
  });
  it('finishes and cancels the stream on done without waiting for the server to close it', async () => {
    const cancel = vi.fn();
    const wire = [
      ['progress', { stage: 'TRANSCRIBING' }], ['done', { success: true, data: { transcript: TRANSCRIPT } }],
    ].map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join('');
    const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(wire)); }, cancel }),
      { headers: { 'Content-Type': 'text/event-stream' } });
    await expect(service(vi.fn().mockResolvedValue(response), { timeoutMs: 40 }).transcribe({ job: JOB, onStage: vi.fn() })).resolves.toEqual(TRANSCRIPT);
    expect(cancel).toHaveBeenCalled();
  });
  it('refuses outbound calls when the internal key is missing', async () => {
    const fetchImpl = vi.fn();
    const client = createVideoRecipeSummaryAiService({ fetchImpl, config: { ...CONFIG, internalApiKey: undefined } });
    await expect(client.summarize({ job: JOB, transcript: TRANSCRIPT })).rejects.toHaveProperty('errorCode', 'AI_NOT_CONFIGURED');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
