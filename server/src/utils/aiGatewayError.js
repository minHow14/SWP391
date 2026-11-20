// d:\Projects\FPT\SWP391\server\src/utils/aiGatewayError.js
// Tiện ích chuẩn hoá lỗi khi gọi AI Service để không lộ lỗi nội bộ của nhà cung cấp AI ra client.
import { ApiError } from './apiError.js';

// Tạo ApiError cho lỗi cổng AI với mã lỗi và thông báo mặc định thân thiện với người dùng.
export function aiGatewayError({ status = 502, code = 'AI_PROVIDER_ERROR', message = 'Dịch vụ AI gặp sự cố. Vui lòng thử lại.' } = {}) {
  const error = new ApiError(status, message);
  error.errorCode = code;
  return error;
}

// Chuẩn hoá lỗi bất kỳ: request bị huỷ thì trả lý do huỷ, ApiError giữ nguyên, lỗi lạ thì quy về lỗi AI chung.
export function normalizeAiError(error, signal) {
  if (signal?.aborted) return signal.reason;
  if (error instanceof ApiError) return error;
  return aiGatewayError();
}

// Dựng phản hồi lỗi theo định dạng API chuẩn (dùng cho luồng stream SSE, nơi không đi qua globalErrorHandler).
export function aiErrorEnvelope(error, requestId) {
  return {
    success: false, message: error.message, errorCode: error.errorCode || 'AI_PROVIDER_ERROR',
    errors: Array.isArray(error.details) ? error.details : [],
    meta: { requestId, ...(error.resetAt ? { resetAt: error.resetAt } : {}) },
  };
}
