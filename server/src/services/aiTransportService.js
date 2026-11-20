// d:\Projects\FPT\SWP391\server\src/services/aiTransportService.js
// Tầng giao tiếp HTTP với AI Service: gửi request kèm khóa nội bộ, mở/đọc stream SSE và gọi API JSON.
import { once } from 'node:events';
import { aiConfig } from '../config/aiConfig.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { aiGatewayError } from '../utils/aiGatewayError.js';
import { createSseParser } from '../utils/sseParser.js';

// Đảm bảo đã cấu hình INTERNAL_API_KEY; thiếu thì báo 503 thay vì gọi AI Service mà không xác thực.
export function assertAiConfigured() {
  if (!aiConfig.internalApiKey) throw aiGatewayError({
    status: 503, code: 'AI_NOT_CONFIGURED', message: 'Dịch vụ AI chưa sẵn sàng. Vui lòng thử lại sau.',
  });
}

// Gửi POST tới AI Service kèm khóa nội bộ, request id và danh tính người dùng/khách (để AI Service áp chính sách riêng).
async function sendAiRequest({ path, payload, signal, requestId, identity = {} }) {
  assertAiConfigured();
  const response = await fetch(`${aiConfig.url}${path}`, {
    method: 'POST', signal,
    headers: {
      'Content-Type': 'application/json', 'X-Internal-Api-Key': aiConfig.internalApiKey,
      ...(requestId ? { 'X-Request-Id': requestId } : {}),
      ...(identity.userId ? { 'X-User-Id': String(identity.userId) } : { 'X-Guest-Id': identity.guestId || '' }),
    },
    body: JSON.stringify(payload ?? {}),
  });
  // AI Service từ chối khóa nội bộ là lỗi cấu hình phía server, nên trả 503 cho client thay vì 401/403.
  if ([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.FORBIDDEN].includes(response.status)) {
    await response.body?.cancel().catch(() => {});
    throw aiGatewayError({ status: HTTP_STATUS.SERVICE_UNAVAILABLE, code: 'AI_INTERNAL_AUTH_FAILED', message: 'Dịch vụ AI chưa sẵn sàng. Vui lòng thử lại sau.' });
  }
  if (!response.ok) throw aiGatewayError();
  return response;
}

// Mở stream SSE; phản hồi không phải text/event-stream được coi là lỗi gateway.
export async function openAiStream(options) {
  const response = await sendAiRequest(options);
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw aiGatewayError();
  return response;
}

// Đọc stream SSE từ AI Service và chuyển từng sự kiện cho `onEvent` cho tới khi parser dừng hoặc stream kết thúc.
export async function readAiStream({ response, onEvent, res, signal }) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser(onEvent);
  try {
    while (!parser.stopped) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      await parser.push(decoder.decode(value, { stream: true }));
      // Tôn trọng backpressure: chờ client đọc kịp (drain) trước khi ghi tiếp.
      if (res.writableNeedDrain) await once(res, 'drain', { signal });
    }
    await parser.push(decoder.decode());
    await parser.end();
  } finally {
    // Luôn hủy reader để giải phóng kết nối tới AI Service kể cả khi lỗi hoặc client ngắt.
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

// Gửi request và đọc phản hồi JSON; JSON hỏng được quy về lỗi gateway.
export async function sendAiJson(options) {
  const response = await sendAiRequest(options);
  const json = await response.json().catch(() => {
    throw aiGatewayError();
  });
  return json;
}

// Yêu cầu AI Service xóa cache chatbot; trả về số mục đã xóa sau khi kiểm tra phản hồi hợp lệ.
export async function clearAiChatCache() {
  const response = await sendAiRequest({
    path: '/api/admin/chatbot-cache/clear', signal: AbortSignal.timeout(aiConfig.timeoutMs),
  }).catch((error) => {
    if (error.errorCode) throw error;
    throw aiGatewayError({ status: 503 });
  });
  const result = await response.json();
  if (!result.success || !Number.isInteger(result.data?.cleared) || result.data.cleared < 0) throw aiGatewayError();
  return result.data.cleared;
}
