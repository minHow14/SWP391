// D:/SWP391/SWP391/client/src/services/aiApi.js
// client/src/services/aiApi.js
import { getSession } from '../utils/session.js';

// Toàn bộ cuộc gọi AI đi qua Backend Gateway API (/api)
const AI_BASE = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');
const GUEST_KEY = 'chayxanh-guest-id';
let memoryGuestId;

export class AiApiError extends Error {
  constructor({ status = 0, code = 'NETWORK_ERROR', message, details, requestId, resetAt, cause } = {}) {
    super(message || 'Không thể kết nối tới dịch vụ AI. Vui lòng thử lại sau.', { cause });
    this.name = 'AiApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.resetAt = resetAt;
  }
}

/** Mã khách, tạo một lần và nhớ lại; dùng cho hạn mức 3 lượt/ngày của khách. */
export function getGuestId() {
  if (memoryGuestId) return memoryGuestId;
  try {
    memoryGuestId = localStorage.getItem(GUEST_KEY);
    if (!memoryGuestId) {
      memoryGuestId = crypto.randomUUID();
      localStorage.setItem(GUEST_KEY, memoryGuestId);
    }
  } catch {
    memoryGuestId ??= crypto.randomUUID();
  }
  return memoryGuestId;
}

function headers(hasBody) {
  const token = getSession()?.token;
  return {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    'X-Guest-Id': getGuestId(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function toError(response) {
  const result = await response.json().catch(() => null);
  const message =
    result?.message ||
    result?.error?.message ||
    (typeof result?.error === 'string' ? result.error : null);
  const code = result?.errorCode || result?.error?.code || `HTTP_${response.status}`;
  return new AiApiError({
    status: response.status,
    code,
    message,
    details: result?.errors || result?.error?.details,
    resetAt: result?.meta?.resetAt,
    requestId: result?.meta?.requestId || response.headers.get('X-Request-Id') || undefined,
  });
}

async function send(path, { method = 'GET', body, signal } = {}) {
  try {
    return await fetch(`${AI_BASE}${path}`, {
      method,
      signal,
      headers: headers(body !== undefined),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new AiApiError({ cause });
  }
}

/** Gọi API JSON thường; trả về `data` của envelope chuẩn. */
async function aiEnvelope(path, options = {}) {
  const response = await send(path, options);
  if (!response.ok) throw await toError(response);
  const result = await response.json().catch(() => null);
  if (!result?.success) {
    throw new AiApiError({
      status: response.status,
      message: result?.message || 'Phản hồi không hợp lệ từ dịch vụ AI.',
    });
  }
  return result;
}

export async function aiRequest(path, options = {}) {
  return (await aiEnvelope(path, options)).data;
}

/** Tách các sự kiện `event:` / `data:` của Server-Sent Events (hỗ trợ \r\n và chunk bị cắt giữa chừng). */
export function createSseParser(onEvent) {
  let buffer = '';
  const flush = (block) => {
    let event = 'message';
    const data = [];
    for (const line of block.split(/\r\n|\r|\n/)) {
      if (!line || line.startsWith(':')) continue;
      const separator = line.indexOf(':');
      const field = separator === -1 ? line : line.slice(0, separator);
      const value = separator === -1 ? '' : line.slice(separator + 1).replace(/^ /, '');
      if (field === 'event') event = value;
      else if (field === 'data') data.push(value);
    }
    if (!data.length) return;
    const text = data.join('\n');
    let payload = text;
    try {
      payload = JSON.parse(text);
    } catch {
      /* giữ nguyên chuỗi */
    }
    onEvent(event, payload);
  };
  return {
    push(chunk) {
      buffer += chunk;
      let boundary = /\r\n\r\n|\n\n|\r\r/.exec(buffer);
      while (boundary) {
        flush(buffer.slice(0, boundary.index));
        buffer = buffer.slice(boundary.index + boundary[0].length);
        boundary = /\r\n\r\n|\n\n|\r\r/.exec(buffer);
      }
    },
    end() {
      if (buffer.trim()) flush(buffer);
      buffer = '';
    },
  };
}

/**
 * POST và đọc luồng SSE qua Backend Gateway.
 */
async function postStream(path, body, { signal, onEvent }) {
  const response = await send(path, { method: 'POST', body, signal });
  if (!response.ok) throw await toError(response);
  if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
    throw new AiApiError({ status: response.status, message: 'Phản hồi không hợp lệ từ dịch vụ AI.' });
  }
  const parser = createSseParser(onEvent);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
    parser.end();
  } finally {
    reader.releaseLock?.();
  }
}

function errorFromEvent(payload) {
  const error = payload?.error;
  return new AiApiError({
    code: error?.code || payload?.errorCode || 'AI_PROVIDER_ERROR',
    message: error?.message || payload?.message,
    details: error?.details || payload?.errors,
    resetAt: payload?.meta?.resetAt,
    requestId: payload?.meta?.requestId,
  });
}

export const getChatUsage = (signal) => aiRequest('/ai/chat/usage', { signal });

/** Hỏi chatbot và nhận câu trả lời dần dần. Trả về { remaining } khi xong. */
export async function streamChat({ message, history, dietaryType, menuContext, signal, onToken }) {
  let remaining = null;
  let failure = null;
  let completed = false;
  await postStream(
    '/ai/chat/stream',
    {
      message,
      ...(history?.length ? { history } : {}),
      ...(dietaryType ? { dietaryType: dietaryType } : {}),
      ...(menuContext ? { menuContext } : {}),
    },
    {
      signal,
      onEvent(name, payload) {
        if (name === 'token') onToken?.(payload?.token ?? '');
        else if (name === 'done') { completed = true; remaining = payload?.remaining ?? null; }
        else if (name === 'error') failure = errorFromEvent(payload);
      },
    }
  );
  if (failure) throw failure;
  if (!completed) throw new AiApiError({ code: 'AI_STREAM_INTERRUPTED', message: 'Kết nối AI kết thúc trước khi trả lời hoàn tất.' });
  return { remaining };
}

/** Tạo thực đơn tuần kèm tiến độ. Trả về thực đơn đầy đủ (có trường `chat`). */
export async function streamMealPlan({ request, signal, onProgress }) {
  let plan = null;
  let failure = null;
  await postStream('/ai/meal-planner/generate/stream', request, {
    signal,
    onEvent(name, payload) {
      if (name === 'progress') onProgress?.(payload?.data ?? {});
      else if (name === 'done') plan = payload?.data ? { ...payload.data, generationId: payload.meta?.generationId ?? null } : null;
      else if (name === 'error') failure = errorFromEvent(payload);
    },
  });
  if (failure) throw failure;
  if (!plan) throw new AiApiError({ message: 'Dịch vụ AI không trả về thực đơn. Vui lòng thử lại.' });
  return plan;
}

// ----- Quản trị (Gọi Backend API Gateway tập trung) -----
const query = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
};
export const adminListLogs = async (params, signal) => {
  const result = await aiEnvelope(`/v1/ai-logs${query(params)}`, { signal });
  return { items: result.data, ...result.meta };
};
export const adminLogStats = (params, signal) => aiRequest(`/v1/ai-logs/stats${query(params)}`, { signal });
export const adminGetGuestQuota = (guestId, signal) =>
  aiRequest(`/v1/guest-quotas/${encodeURIComponent(guestId)}`, { signal });
export const adminResetGuestQuota = (guestId) =>
  aiRequest(`/v1/guest-quotas/${encodeURIComponent(guestId)}`, { method: 'DELETE' });
export const adminClearChatCache = () => aiRequest('/admin/ai/chatbot-cache/clear', { method: 'POST' });
