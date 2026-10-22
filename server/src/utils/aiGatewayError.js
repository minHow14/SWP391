// D:/SWP391/SWP391/server/src/utils/aiGatewayError.js
import { ApiError } from './apiError.js';

export function aiGatewayError({ status = 502, code = 'AI_PROVIDER_ERROR', message = 'Dịch vụ AI gặp sự cố. Vui lòng thử lại.' } = {}) {
  const error = new ApiError(status, message);
  error.errorCode = code;
  return error;
}

export function normalizeAiError(error, signal) {
  if (signal?.aborted) return signal.reason;
  if (error instanceof ApiError) return error;
  return aiGatewayError();
}

export function aiErrorEnvelope(error, requestId) {
  return {
    success: false, message: error.message, errorCode: error.errorCode || 'AI_PROVIDER_ERROR',
    errors: Array.isArray(error.details) ? error.details : [],
    meta: { requestId, ...(error.resetAt ? { resetAt: error.resetAt } : {}) },
  };
}
