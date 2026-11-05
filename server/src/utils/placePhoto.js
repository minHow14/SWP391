// D:/SWP391/SWP391/server/src/utils/placePhoto.js
export function placePhotoUrl(value) {
  if (typeof value !== 'string') return null;
  if (value.startsWith('/uploads/') && !value.includes('..')) return value;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    // Stock photos cannot establish what a particular restaurant actually looks like.
    if (url.hostname === 'images.unsplash.com') return null;
    return url.href;
  } catch {
    return null;
  }
}
