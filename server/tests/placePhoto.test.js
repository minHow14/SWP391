// D:/SWP391/SWP391/server/tests/placePhoto.test.js
// Kiểm thử hàm placePhotoUrl: chỉ chấp nhận ảnh địa điểm thật, an toàn.
import { expect, it } from 'vitest';
import { placePhotoUrl } from '../src/utils/placePhoto.js';

// Ảnh upload cục bộ và URL tuyệt đối hợp lệ phải được giữ nguyên để hiển thị đúng ảnh quán.
it('keeps real local uploads and absolute photo URLs', () => {
  expect(placePhotoUrl('/uploads/restaurants/2.jpg')).toBe('/uploads/restaurants/2.jpg');
  const url = 'https://lh3.googleusercontent.com/places/restaurant-photo';
  expect(placePhotoUrl(url)).toBe(url);
});

// Giá trị rỗng, đường dẫn Google Places thô, URL nguy hiểm (javascript:, //) hoặc ảnh minh họa không liên quan
// phải trả về null thay vì hiển thị ảnh sai hoặc gây lỗ hổng XSS.
it.each([null, '', 'places/place-id/photos/photo-id', 'javascript:alert(1)', '//untrusted/photo.jpg',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format', '/demo-assets/photo.webp'])
('returns no photo rather than an unrelated image for %s', (value) => {
  expect(placePhotoUrl(value)).toBeNull();
});
