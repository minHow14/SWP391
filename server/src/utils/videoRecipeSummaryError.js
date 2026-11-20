// D:/SWP391/SWP391/server/src/utils/videoRecipeSummaryError.js
// Tạo lỗi cho luồng tóm tắt công thức từ video, kèm thông tin có nên thử lại hay không.
import { ApiError } from './apiError.js';

// retryable/retryAfterMs cho worker biết có lên lịch thử lại job và sau bao lâu.
export function videoRecipeSummaryError({ code, message, status = 422, retryable = false, retryAfterMs = 0 }) {
  return Object.assign(new ApiError(status, message), { errorCode: code, retryable, retryAfterMs });
}

// Lỗi khi worker mất quyền giữ job (lease đã bị worker khác nhận), không được ghi đè kết quả.
export function lostVideoRecipeLease() {
  return videoRecipeSummaryError({ code: 'VIDEO_JOB_LEASE_LOST', message: 'Tác vụ đã được chuyển sang tiến trình khác.', status: 409 });
}
