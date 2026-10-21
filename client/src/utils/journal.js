// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/utils/journal.js

export const mealGroups = [
  { id: 'breakfast', name: 'Bữa Sáng', icon: 'sun-fill', tone: 'amber' },
  { id: 'lunch', name: 'Bữa Trưa', icon: 'basket-fill', tone: 'green' },
  { id: 'dinner', name: 'Bữa Tối', icon: 'moon-fill', tone: 'blue' },
  { id: 'snack', name: 'Bữa Phụ & Trái Cây', icon: 'apple', tone: 'purple' },
];
export function todayKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function weekDates(date) {
  const anchor = new Date(`${date}T12:00:00Z`);
  const start = new Date(anchor);
  start.setUTCDate(anchor.getUTCDate() - (anchor.getUTCDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}
export function totals(entries = []) {
  return entries.reduce((sum, entry) => Object.fromEntries(Object.entries(sum).map(([key, value]) => [key, Math.round((value + entry[key]) * 10) / 10])), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
}

