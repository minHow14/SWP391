// client/src/features/journal/utils/journalViewHelpers.js

export const formatJournalNumber = (value) =>
  Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 1 });

export const displayJournalDate = (date, options = { day: '2-digit', month: '2-digit' }) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Bangkok', ...options }).format(
    new Date(`${date}T12:00:00Z`)
  );
};
