// D:/SWP391/SWP391/server/src/services/videoRecipeSummaryAiService.js
import { aiConfig } from '../config/aiConfig.js';
import { videoRecipeSummaryConfig } from '../config/videoRecipeSummaryConfig.js';
import { MAX_AI_RESPONSE_BYTES, MAX_VIDEO_DURATION_SECONDS } from '../constants/videoRecipeSummary.js';
import { videoRecipeSummaryError } from '../utils/videoRecipeSummaryError.js';
import { createSseParser } from '../utils/sseParser.js';
import { transcriptSchema } from '../validators/videoRecipeSummaryValidator.js';

const TRANSCRIPTION_STAGES = ['FETCHING_AUDIO', 'TRANSCRIBING'];
const invalidOutput = () => videoRecipeSummaryError({ status: 502, code: 'VIDEO_AI_INVALID_OUTPUT', message: 'Dịch vụ AI trả về dữ liệu video không hợp lệ.' });
const unavailable = () => videoRecipeSummaryError({ status: 503, code: 'VIDEO_AI_UNAVAILABLE', message: 'Dịch vụ xử lý video tạm thời không khả dụng.', retryable: true });
const SOURCE_ERRORS = Object.freeze({ VIDEO_TOO_LONG: 'Video cần có thời lượng không quá 11 phút.',
  VIDEO_NO_SPEECH: 'Video không có đủ lời nói để tạo công thức.', VIDEO_AUDIO_UNAVAILABLE: 'Không lấy được âm thanh của video.',
  VIDEO_NOT_RECIPE: 'Không tìm thấy đủ hướng dẫn nấu ăn trong lời nói của video.' });

function normalizedFailure(error, signal) {
  if (signal?.aborted && signal.reason?.errorCode) return signal.reason;
  if (error.errorCode) return error;
  if (signal?.aborted) return videoRecipeSummaryError({ status: 504, code: 'VIDEO_AI_TIMEOUT', message: 'Dịch vụ xử lý video đã quá thời gian chờ.', retryable: true });
  return unavailable();
}

function retryDelay(header) {
  const delay = /^\d+$/.test(header || '') ? Number(header) * 1000 : Date.parse(header) - Date.now();
  return Number.isFinite(delay) && delay > 0 ? Math.min(delay, 2_147_483_647) : 0;
}

function responseFailure(response) {
  if (response.status === 429) return videoRecipeSummaryError({ status: 429, code: 'VIDEO_AI_RATE_LIMITED',
    message: 'Dịch vụ nhận dạng đang hết hạn mức. Hệ thống sẽ thử lại sau.', retryable: true, retryAfterMs: retryDelay(response.headers.get('retry-after')) });
  if ([401, 403].includes(response.status)) return videoRecipeSummaryError({ status: 503,
    code: 'AI_INTERNAL_AUTH_FAILED', message: 'Dịch vụ xử lý video chưa xác thực được kết nối nội bộ.' });
  if (response.status === 404) return videoRecipeSummaryError({ status: 503,
    code: 'VIDEO_AI_NOT_READY', message: 'Chức năng xử lý video của AI Service chưa sẵn sàng.' });
  if (response.status >= 500) return unavailable();
  return videoRecipeSummaryError({ code: 'VIDEO_AI_REJECTED', message: 'Dịch vụ AI không xử lý được âm thanh hoặc nội dung video này.' });
}

async function consumeBody({ response, signal, onChunk }) {
  if (!response.body) throw invalidOutput();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  const cancel = () => { reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_AI_RESPONSE_BYTES) throw invalidOutput();
      if (await onChunk(decoder.decode(value, { stream: true })) === false) break;
    }
    await onChunk(decoder.decode());
  } finally {
    signal.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function transcriptionResult({ response, signal, onStage }) {
  if (!response.headers.get('content-type')?.includes('text/event-stream')) throw invalidOutput();
  let stageIndex = -1;
  let transcript;
  const parser = createSseParser(async ({ name, data }) => {
    if (name === 'error') throw SOURCE_ERRORS[data.errorCode]
      ? videoRecipeSummaryError({ code: data.errorCode, message: SOURCE_ERRORS[data.errorCode] }) : unavailable();
    if (name === 'progress') {
      const nextIndex = TRANSCRIPTION_STAGES.indexOf(data.stage);
      if (nextIndex < stageIndex || nextIndex < 0) throw invalidOutput();
      stageIndex = nextIndex;
      await onStage(data.stage);
      return;
    }
    if (name !== 'done' || data.success !== true || stageIndex !== 1) throw invalidOutput();
    const parsed = transcriptSchema.safeParse(data.data?.transcript);
    if (!parsed.success) throw invalidOutput();
    transcript = parsed.data;
    return false;
  });
  await consumeBody({ response, signal, onChunk: async (chunk) => { await parser.push(chunk); return !parser.stopped; } });
  await parser.end();
  if (!transcript) throw invalidOutput();
  return transcript;
}

async function summaryResult({ response, signal }) {
  if (!response.headers.get('content-type')?.includes('application/json')) throw invalidOutput();
  let body = '';
  await consumeBody({ response, signal, onChunk: (chunk) => { body += chunk; } });
  let result;
  try { result = JSON.parse(body); } catch { throw invalidOutput(); }
  if (result.success !== true || !result.data?.recipe) throw invalidOutput();
  return result.data.recipe;
}

export function createVideoRecipeSummaryAiService({ fetchImpl = globalThis.fetch, config = aiConfig, timeoutMs = videoRecipeSummaryConfig.aiTimeoutMs } = {}) {
  async function request({ path, payload, signal, accept }) {
    if (!config.internalApiKey) throw videoRecipeSummaryError({ status: 503, code: 'AI_NOT_CONFIGURED', message: 'Chưa cấu hình kết nối AI Service.' });
    const activeSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
    try {
      const response = await fetchImpl(`${config.url}${path}`, { method: 'POST', redirect: 'error', signal: activeSignal,
        headers: { 'Content-Type': 'application/json', Accept: accept, 'X-Internal-Api-Key': config.internalApiKey }, body: JSON.stringify(payload) });
      if (!response.ok) { await response.body?.cancel().catch(() => {}); throw responseFailure(response); }
      return { response, signal: activeSignal };
    } catch (error) { throw normalizedFailure(error, activeSignal); }
  }
  return {
    async transcribe({ job, onStage, signal }) {
      const context = await request({ path: '/api/video-recipe-transcriptions/stream', signal, accept: 'text/event-stream',
        payload: { jobId: job.id, videoId: job.videoId, videoUrl: job.videoUrl,
          maxDurationSeconds: MAX_VIDEO_DURATION_SECONDS, model: 'whisper-large-v3', language: 'vi' } });
      try { return await transcriptionResult({ ...context, onStage }); }
      catch (error) { throw normalizedFailure(error, context.signal); }
    },
    async summarize({ job, transcript, signal }) {
      const context = await request({ path: '/api/video-recipe-summaries', signal, accept: 'application/json',
        payload: { jobId: job.id, videoId: job.videoId, language: 'vi', transcript } });
      try { return await summaryResult(context); }
      catch (error) { throw normalizedFailure(error, context.signal); }
    },
  };
}

export const videoRecipeSummaryAiService = createVideoRecipeSummaryAiService();
