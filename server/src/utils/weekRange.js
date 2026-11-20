// server/src/utils/weekRange.js
// Tính khoảng tuần (Thứ Hai → Chủ Nhật) cho thực đơn tuần.
const DAYS_IN_WEEK = 7;

/** Tuần ISO (Thứ Hai → Chủ Nhật) chứa ngày `YYYY-MM-DD`, tính theo UTC giống cột `@db.Date`. */
export function weekRangeOf(dateString) {
  const day = new Date(dateString);
  const monday = new Date(day);
  monday.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + DAYS_IN_WEEK - 1);
  return { monday, sunday };
}
