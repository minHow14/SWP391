// D:/SWP391/SWP391/server/src/utils/placePhoto.js
// Kiểm tra và chuẩn hoá URL ảnh địa điểm trước khi trả về client.
// Chỉ chấp nhận ảnh đã tải lên local (không chứa ".." để chống path traversal) hoặc URL http/https hợp lệ; còn lại trả về null.
export function placePhotoUrl(value) {
  if (typeof value !== 'string') return null;
  if (value.startsWith('/uploads/') && !value.includes('..')) return value;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    // Ảnh stock không thể hiện được diện mạo thật của một nhà hàng cụ thể.
    if (url.hostname === 'images.unsplash.com') return null;
    return url.href;
  } catch {
    return null;
  }
}
