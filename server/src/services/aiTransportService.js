// D:/SWP391/SWP391/server/src/services/aiTransportService.js
import { once } from 'node:events';
import { aiConfig } from '../config/aiConfig.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { aiGatewayError } from '../utils/aiGatewayError.js';
import { createSseParser } from '../utils/sseParser.js';

export function assertAiConfigured() {
  if (!aiConfig.internalApiKey) throw aiGatewayError({
    status: 503, code: 'AI_NOT_CONFIGURED', message: 'Dịch vụ AI chưa sẵn sàng. Vui lòng thử lại sau.',
  });
}

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
  if ([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.FORBIDDEN].includes(response.status)) {
    await response.body?.cancel().catch(() => {});
    throw aiGatewayError({ status: HTTP_STATUS.SERVICE_UNAVAILABLE, code: 'AI_INTERNAL_AUTH_FAILED', message: 'Dịch vụ AI chưa sẵn sàng. Vui lòng thử lại sau.' });
  }
  if (!response.ok) throw aiGatewayError();
  return response;
}

export async function openAiStream(options) {
  const response = await sendAiRequest(options);
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw aiGatewayError();
  return response;
}

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
      if (res.writableNeedDrain) await once(res, 'drain', { signal });
    }
    await parser.push(decoder.decode());
    await parser.end();
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

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
