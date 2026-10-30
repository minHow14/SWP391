// D:/SWP391/SWP391/server/src/services/contentModerationAiService.js
import { aiConfig } from '../config/aiConfig.js';
import { contentModerationConfig } from '../config/contentModerationConfig.js';
import { MODERATION_AI_PATH, MODERATION_MAX_RESPONSE_BYTES } from '../constants/contentModeration.js';
import { ApiError } from '../utils/apiError.js';
import { validateContentModerationResult } from '../validators/contentModerationValidator.js';

export function contentModerationError({ code, retryable = false }) {
  return Object.assign(new ApiError(503, 'Chưa thể hoàn tất kiểm duyệt tự động. Nội dung đang chờ xử lý.'),
    { errorCode: code, retryable });
}
const invalidOutput = () => contentModerationError({ code: 'MODERATION_AI_INVALID_OUTPUT', retryable: true });

async function readResult(response, job) {
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
    return validateContentModerationResult(body.data, job);
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

async function checkResponse(response) {
  if (response.ok) return;
  await response.body?.cancel().catch(() => {});
  const authFailed = [401, 403].includes(response.status);
  throw contentModerationError({ code: authFailed ? 'MODERATION_AI_AUTH_FAILED' : 'MODERATION_AI_UNAVAILABLE',
    retryable: response.status === 429 || response.status >= 500 });
}

export function createContentModerationAiService({ fetchImpl = globalThis.fetch, config = aiConfig,
  timeoutMs = contentModerationConfig.timeoutMs } = {}) {
  return {
    async moderate({ job, signal }) {
      if (!config.internalApiKey) throw contentModerationError({ code: 'AI_NOT_CONFIGURED' });
      const deadline = AbortSignal.timeout(timeoutMs);
      const activeSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
      try {
        activeSignal.throwIfAborted();
        const response = await fetchImpl(`${config.url}${MODERATION_AI_PATH}`, { method: 'POST', redirect: 'error', signal: activeSignal,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Internal-Api-Key': config.internalApiKey,
            'X-Request-Id': job.id },
          body: JSON.stringify({ jobId: job.id, contentType: job.postId ? 'POST' : 'COMMENT', contentVersion: job.contentVersion,
            title: job.title || undefined, content: job.content }) });
        await checkResponse(response);
        return await readResult(response, job).catch((error) => { if (activeSignal.aborted) throw error; throw invalidOutput(); });
      } catch (error) {
        if (signal?.aborted) throw contentModerationError({ code: 'MODERATION_INTERRUPTED', retryable: true });
        if (deadline.aborted) throw contentModerationError({ code: 'MODERATION_AI_TIMEOUT', retryable: true });
        if (error.errorCode) throw error;
        throw contentModerationError({ code: 'MODERATION_AI_UNAVAILABLE', retryable: true });
      }
    },
  };
}
export const contentModerationAiService = createContentModerationAiService();
