// D:/SWP391/SWP391/server/src/utils/aiLogDate.js
import { MILLISECONDS_PER_DAY } from './aiQuotaDate.js';

export function getAiLogDateRange({ dateFrom, dateTo }) {
  const range = {};
  if (dateFrom) range.gte = new Date(`${dateFrom}T00:00:00+07:00`);
  if (dateTo) range.lt = new Date(new Date(`${dateTo}T00:00:00+07:00`).getTime() + MILLISECONDS_PER_DAY);
  return range;
}
