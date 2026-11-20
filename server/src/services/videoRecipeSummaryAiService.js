// D:/SWP391/SWP391/server/src/services/videoRecipeSummaryAiService.js
// Gọi AI Service để nhận dạng phụ đề (stream SSE) và tóm tắt công thức từ video, với kiểm tra chặt dữ liệu trả về.
import { aiConfig } from '../config/aiConfig.js';
import { videoRecipeSummaryConfig } from '../config/videoRecipeSummaryConfig.js';
import { MAX_AI_RESPONSE_BYTES, MAX_VIDEO_DURATION_SECONDS } from '../constants/videoRecipeSummary.js';
import { videoRecipeSummaryError } from '../utils/videoRecipeSummaryError.js';
import { createSseParser } from '../utils/sseParser.js';
import { transcriptSchema } from '../validators/videoRecipeSummaryValidator.js';

// Thứ tự các giai đoạn hợp lệ của luồng nhận dạng; dùng để phát hiện sự kiện progress sai thứ tự.
const TRANSCRIPTION_STAGES = ['FETCHING_CAPTIONS'];
const invalidOutput = () => videoRecipeSummaryError({ status: 502, code: 'VIDEO_AI_INVALID_OUTPUT', message: 'Dịch vụ AI trả về dữ liệu video không hợp lệ.' });
const unavailable = () => videoRecipeSummaryError({ status: 503, code: 'VIDEO_AI_UNAVAILABLE', message: 'Dịch vụ xử lý video tạm thời không khả dụng.', retryable: true });
// Ánh xạ mã lỗi nguồn video do AI Service trả về sang lỗi nghiệp vụ hiển thị cho người dùng.
const SOURCE_ERRORS = Object.freeze({
  VIDEO_TOO_LONG: { message: 'Video cần có thời lượng không quá 11 phút.' },
  VIDEO_UNAVAILABLE: { message: 'Không thể truy cập video YouTube này.' },
  VIDEO_CAPTIONS_UNAVAILABLE: { message: 'Video chưa có phụ đề phù hợp' },
  VIDEO_CAPTIONS_BLOCKED: { status: 503, message: 'YouTube đang chặn truy cập phụ đề. Vui lòng thử lại sau.' },
  VIDEO_CAPTIONS_TIMEOUT: { status: 504, retryable: true, message: 'Lấy phụ đề video đã quá thời gian chờ.' },
  VIDEO_NOT_RECIPE: { message: 'Không tìm thấy đủ hướng dẫn nấu ăn trong phụ đề video.' },
});

// Chuẩn hóa lỗi: ưu tiên lý do hủy có mã lỗi, hủy không rõ lý do coi là timeout (có thể thử lại).
function normalizedFailure(error, signal) {
  if (signal?.aborted && signal.reason?.errorCode) return signal.reason;
  if (error.errorCode) return error;
  if (signal?.aborted) return videoRecipeSummaryError({ status: 504, code: 'VIDEO_AI_TIMEOUT', message: 'Dịch vụ xử lý video đã quá thời gian chờ.', retryable: true });
  return unavailable();
}

// Đọc header Retry-After (số giây hoặc ngày giờ HTTP) thành số ms chờ.
function retryDelay(header) {
  const delay = /^\d+$/.test(header || '') ? Number(header) * 1000 : Date.parse(header) - Date.now();
  // Giá trị vượt giới hạn setTimeout (2^31-1 ms) bị coi là dữ liệu bất thường.
  if (delay > 2_147_483_647) throw invalidOutput();
  return Number.isFinite(delay) && delay > 0 ? delay : 0;
}

// Chuyển sự kiện 'error' trong stream thành lỗi nghiệp vụ; chỉ lỗi rate limit mang thời gian chờ thử lại.
function streamFailure(data) {
  if (Object.hasOwn(SOURCE_ERRORS, data.errorCode)) return videoRecipeSummaryError({ code: data.errorCode, ...SOURCE_ERRORS[data.errorCode] });
  if (data.errorCode !== 'VIDEO_AI_RATE_LIMITED') return unavailable();
  const retryAfterMs = data.retryAfterMs ?? 0;
  if (!Number.isSafeInteger(retryAfterMs) || retryAfterMs < 0 || retryAfterMs > 2_147_483_647) throw invalidOutput();
  return videoRecipeSummaryError({ status: 429, code: 'VIDEO_AI_RATE_LIMITED', retryable: true, retryAfterMs,
    message: 'Dịch vụ AI đang hết hạn mức. Hệ thống sẽ thử lại sau.' });
}

// Ánh xạ mã HTTP lỗi từ AI Service: 429 thử lại sau, 401/403 lỗi cấu hình khóa, 404 chưa triển khai, 5xx tạm thời.
function responseFailure(response) {
  if (response.status === 429) return videoRecipeSummaryError({ status: 429, code: 'VIDEO_AI_RATE_LIMITED',
    message: 'Dịch vụ AI đang hết hạn mức. Hệ thống sẽ thử lại sau.', retryable: true, retryAfterMs: retryDelay(response.headers.get('retry-after')) });
  if ([401, 403].includes(response.status)) return videoRecipeSummaryError({ status: 503,
    code: 'AI_INTERNAL_AUTH_FAILED', message: 'Dịch vụ xử lý video chưa xác thực được kết nối nội bộ.' });
  if (response.status === 404) return videoRecipeSummaryError({ status: 503,
    code: 'VIDEO_AI_NOT_READY', message: 'Chức năng xử lý video của AI Service chưa sẵn sàng.' });
  if (response.status >= 500) return unavailable();
  return videoRecipeSummaryError({ code: 'VIDEO_AI_REJECTED', message: 'Dịch vụ AI không xử lý được phụ đề hoặc nội dung video này.' });
}

// Đọc thân phản hồi theo chunk, giới hạn tổng byte và dừng ngay khi bị hủy; onChunk trả false để dừng sớm.
async function consumeBody({ response, signal, onChunk }) {
  if (!response.body) throw invalidOutput();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  // Khi bị hủy thì hủy reader để lệnh read() đang chờ kết thúc ngay.
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

// Đọc kết quả nhận dạng từ stream SSE; bắt buộc đi qua đủ các giai đoạn theo thứ tự trước sự kiện 'done'.
async function transcriptionResult({ response, signal, onStage }) {
  if (!response.headers.get('content-type')?.includes('text/event-stream')) throw invalidOutput();
  let stageIndex = -1;
  let transcript;
  const parser = createSseParser(async ({ name, data }) => {
    if (name === 'error') throw streamFailure(data);
    if (name === 'progress') {
      const nextIndex = TRANSCRIPTION_STAGES.indexOf(data.stage);
      if (nextIndex < stageIndex || nextIndex < 0) throw invalidOutput();
      stageIndex = nextIndex;
      await onStage(data.stage);
      return;
    }
    if (name !== 'done' || data.success !== true || stageIndex !== TRANSCRIPTION_STAGES.length - 1) throw invalidOutput();
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

// Đọc kết quả tóm tắt dạng JSON và lấy ra công thức.
async function summaryResult({ response, signal }) {
  if (!response.headers.get('content-type')?.includes('application/json')) throw invalidOutput();
  let body = '';
  await consumeBody({ response, signal, onChunk: (chunk) => { body += chunk; } });
  let result;
  try { result = JSON.parse(body); } catch { throw invalidOutput(); }
  if (result.success !== true || !result.data?.recipe) throw invalidOutput();
  return result.data.recipe;
}

// Factory tạo service AI cho video; cho phép inject fetch/config/timeout khi test.
export function createVideoRecipeSummaryAiService({ fetchImpl = globalThis.fetch, config = aiConfig, timeoutMs = videoRecipeSummaryConfig.aiTimeoutMs } = {}) {
  // Gửi request tới AI Service với timeout và khóa nội bộ; redirect: 'error' để không gửi khóa sang host khác.
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
    // Nhận dạng phụ đề video bằng tiếng Việt, báo tiến trình qua onStage.
    async transcribe({ job, metadata, onStage, signal }) {
      const context = await request({ path: '/api/video-recipe-transcriptions/stream', signal, accept: 'text/event-stream',
        payload: { jobId: job.id, videoId: job.videoId, videoUrl: job.videoUrl,
          maxDurationSeconds: MAX_VIDEO_DURATION_SECONDS, durationSeconds: metadata.durationSeconds, language: 'vi' } });
      try { return await transcriptionResult({ ...context, onStage }); }
      catch (error) { throw normalizedFailure(error, context.signal); }
    },
    // Tóm tắt transcript thành công thức nấu ăn.
    async summarize({ job, transcript, signal }) {
      const context = await request({ path: '/api/video-recipe-summaries', signal, accept: 'application/json',
        payload: { jobId: job.id, videoId: job.videoId, language: 'vi', transcript } });
      try { return await summaryResult(context); }
      catch (error) { throw normalizedFailure(error, context.signal); }
    },
  };
}

// Instance mặc định dùng trong ứng dụng.
export const videoRecipeSummaryAiService = createVideoRecipeSummaryAiService();
