// server/src/utils/videoRecipeSummaryError.js
import { ApiError } from './apiError.js';

export function videoRecipeSummaryError({ code, message, status = 422, retryable = false, retryAfterMs = 0 }) {
  return Object.assign(new ApiError(status, message), { errorCode: code, retryable, retryAfterMs });
}

export function lostVideoRecipeLease() {
  return videoRecipeSummaryError({ code: 'VIDEO_JOB_LEASE_LOST', message: 'Tác vụ đã được chuyển sang tiến trình khác.', status: 409 });
}
