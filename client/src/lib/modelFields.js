// Demo identifiers only. Production identifiers must come from the backend.
export const DIET_TYPE_IDS = Object.freeze({
  vegan: 1,
  lacto: 2,
  ovo: 3,
  'lacto-ovo': 4,
  buddhist: 5,
  explore: 6,
});
export const DEMO_USER_ID = 9001;
let nextDemoId = 10000;
export function createDemoId() {
  return nextDemoId++;
}
export function formatDuration(seconds) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
export function formatCreatedAt(created_at) {
  return new Date(created_at).toLocaleString('vi-VN', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}
