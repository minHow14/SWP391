// d:\Projects\FPT\SWP391\server\src/utils/aiQuotaDate.js
// Tính kỳ hạn mức AI theo ngày lịch Việt Nam (UTC+7) bất kể múi giờ của máy chủ.
const MILLISECONDS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 24 * 60;
export const MILLISECONDS_PER_DAY = MINUTES_PER_DAY * MILLISECONDS_PER_MINUTE;
const VIETNAM_UTC_OFFSET_MINUTES = 7 * 60;
const VIETNAM_UTC_OFFSET_MS = VIETNAM_UTC_OFFSET_MINUTES * MILLISECONDS_PER_MINUTE;

// Trả về ngày tính hạn mức (DATE ở UTC) và thời điểm hạn mức được làm mới (00:00 giờ Việt Nam hôm sau, ISO 8601).
export function getAiQuotaPeriod(now = new Date()) {
  const vietnamDate = new Date(now.getTime() + VIETNAM_UTC_OFFSET_MS);
  // PostgreSQL DATE nhận ngày lịch ở UTC để không phụ thuộc múi giờ của máy chạy BE.
  const quotaDate = new Date(Date.UTC(
    vietnamDate.getUTCFullYear(), vietnamDate.getUTCMonth(), vietnamDate.getUTCDate(),
  ));
  const resetsAt = new Date(quotaDate.getTime() + MILLISECONDS_PER_DAY - VIETNAM_UTC_OFFSET_MS);
  return { quotaDate, resetsAt: resetsAt.toISOString() };
}
