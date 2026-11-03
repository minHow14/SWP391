// D:/SWP391/SWP391/server/tests/placePhoto.test.js
import { expect, it } from 'vitest';
import { placePhotoUrl } from '../src/utils/placePhoto.js';

it('keeps real local uploads and absolute photo URLs', () => {
  expect(placePhotoUrl('/uploads/restaurants/2.jpg')).toBe('/uploads/restaurants/2.jpg');
  const url = 'https://lh3.googleusercontent.com/places/restaurant-photo';
  expect(placePhotoUrl(url)).toBe(url);
});

it.each([null, '', 'places/place-id/photos/photo-id', 'javascript:alert(1)', '//untrusted/photo.jpg',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format', '/demo-assets/photo.webp'])
('returns no photo rather than an unrelated image for %s', (value) => {
  expect(placePhotoUrl(value)).toBeNull();
});
