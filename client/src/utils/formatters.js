// client/src/utils/formatters.js
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

export function formatRecordedDateTime(rawDate) {
  if (!rawDate) return 'N/A';
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return 'N/A';

  const isPureDateUtc =
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0;

  if (isPureDateUtc) {
    return d.toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
