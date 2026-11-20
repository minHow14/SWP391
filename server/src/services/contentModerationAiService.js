// D:/SWP391/SWP391/server/src/services/contentModerationAiService.js
// Gọi AI Service để kiểm duyệt văn bản và ảnh của bài viết/bình luận, với timeout và giới hạn kích thước phản hồi.
import { aiConfig } from '../config/aiConfig.js';
import { contentModerationConfig } from '../config/contentModerationConfig.js';
import { MODERATION_AI_PATH, MODERATION_IMAGE_AI_PATH, MODERATION_MAX_RESPONSE_BYTES } from '../constants/contentModeration.js';
import { ApiError } from '../utils/apiError.js';
import { validateContentModerationResult, validateImageModerationResult } from '../validators/contentModerationValidator.js';

// Tạo lỗi kiểm duyệt (503) kèm mã lỗi và cờ cho phép thử lại; nội dung vẫn ở trạng thái chờ duyệt.
export function contentModerationError({ code, retryable = false }) {
  return Object.assign(new ApiError(503, 'Chưa thể hoàn tất kiểm duyệt tự động. Nội dung đang chờ xử lý.'),
    { errorCode: code, retryable });
}
// Output AI không hợp lệ có thể do mô hình trả lời ngẫu nhiên, nên cho phép thử lại.
const invalidOutput = () => contentModerationError({ code: 'MODERATION_AI_INVALID_OUTPUT', retryable: true });

// Đọc phản hồi JSON theo từng chunk và dừng ngay khi vượt giới hạn byte, tránh AI Service trả về dữ liệu quá lớn làm tràn bộ nhớ.
async function readResult(response, parse) {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    await response.body?.cancel();
    throw invalidOutput();
  }
  const reader = response.body?.getReader();
  if (!reader) throw invalidOutput();
  let bytes = 0;
  const chunks = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MODERATION_MAX_RESPONSE_BYTES) throw invalidOutput();
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (body.success !== true) throw invalidOutput();
    return parse(body.data);
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

// Kiểm tra mã HTTP: chỉ 429 và 5xx được thử lại; 401/403 là lỗi cấu hình khóa nội bộ.
async function checkResponse(response) {
  if (response.ok) return;
  await response.body?.cancel().catch(() => {});
  const authFailed = [401, 403].includes(response.status);
  throw contentModerationError({ code: authFailed ? 'MODERATION_AI_AUTH_FAILED' : 'MODERATION_AI_UNAVAILABLE',
    retryable: response.status === 429 || response.status >= 500 });
}

// Ngữ cảnh nội dung gửi kèm mỗi lần kiểm duyệt.
const jobContext = (job) => ({ jobId: job.id, contentType: job.postId ? 'POST' : 'COMMENT',
  contentVersion: job.contentVersion, title: job.title || undefined, content: job.content });

// Factory tạo service kiểm duyệt; cho phép inject fetch/config/timeout khi test.
export function createContentModerationAiService({ fetchImpl = globalThis.fetch, config = aiConfig,
  timeoutMs = contentModerationConfig.timeoutMs } = {}) {
  // Gửi một yêu cầu kiểm duyệt và trả về phán quyết đã validate; phân loại lỗi hủy, timeout và lỗi khác.
  async function postForVerdict({ path, job, body, parse, signal }) {
    if (!config.internalApiKey) throw contentModerationError({ code: 'AI_NOT_CONFIGURED' });
    const deadline = AbortSignal.timeout(timeoutMs);
    const activeSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
    try {
      activeSignal.throwIfAborted();
      // redirect: 'error' để không bị chuyển hướng gửi khóa nội bộ tới host khác.
      const response = await fetchImpl(`${config.url}${path}`, { method: 'POST', redirect: 'error', signal: activeSignal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Internal-Api-Key': config.internalApiKey,
          'X-Request-Id': job.id },
        body: JSON.stringify(body) });
      await checkResponse(response);
      return await readResult(response, parse).catch((error) => { if (activeSignal.aborted) throw error; throw invalidOutput(); });
    } catch (error) {
      // Phân biệt bị hủy từ bên ngoài (worker dừng) với hết thời gian chờ để ghi đúng mã lỗi.
      if (signal?.aborted) throw contentModerationError({ code: 'MODERATION_INTERRUPTED', retryable: true });
      if (deadline.aborted) throw contentModerationError({ code: 'MODERATION_AI_TIMEOUT', retryable: true });
      if (error.errorCode) throw error;
      throw contentModerationError({ code: 'MODERATION_AI_UNAVAILABLE', retryable: true });
    }
  }

  return {
    // Kiểm duyệt phần văn bản (tiêu đề, nội dung).
    moderate({ job, signal }) {
      return postForVerdict({ path: MODERATION_AI_PATH, job, body: jobContext(job), signal,
        parse: (data) => validateContentModerationResult(data, job) });
    },
    // Văn bản bài viết được gửi kèm mỗi ảnh để món chay có chú thích không bị nhầm là món mặn.
    moderateImage({ job, imageIndex, image, signal }) {
      return postForVerdict({ path: MODERATION_IMAGE_AI_PATH, job, signal, parse: validateImageModerationResult,
        body: { ...jobContext(job), imageIndex, mimeType: image.mimeType, imageBase64: image.imageBase64 } });
    },
  };
}
// Instance mặc định dùng trong ứng dụng.
export const contentModerationAiService = createContentModerationAiService();
