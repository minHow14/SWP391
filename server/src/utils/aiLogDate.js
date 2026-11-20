// d:\Projects\FPT\SWP391\server\src/utils/aiLogDate.js
// Chuyển khoảng ngày lọc nhật ký AI (YYYY-MM-DD) thành điều kiện thời gian Prisma theo giờ Việt Nam.
import { MILLISECONDS_PER_DAY } from './aiQuotaDate.js';

// dateTo được tính bao gồm cả ngày đó nên lấy mốc nhỏ hơn 00:00 của ngày kế tiếp.
export function getAiLogDateRange({ dateFrom, dateTo }) {
  const range = {};
  if (dateFrom) range.gte = new Date(`${dateFrom}T00:00:00+07:00`);
  if (dateTo) range.lt = new Date(new Date(`${dateTo}T00:00:00+07:00`).getTime() + MILLISECONDS_PER_DAY);
  return range;
}
