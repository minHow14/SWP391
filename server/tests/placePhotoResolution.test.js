// d:/Projects/FPT/SWP391/server/tests/placePhotoResolution.test.js
// Kiểm thử việc lấy ảnh địa điểm từ nhà cung cấp bản đồ (Ziomap): bảo mật API key, deadline và giới hạn đồng thời.
import { afterEach, expect, it, vi } from 'vitest';
import { clearZiomapCache, resolvePlacePhoto, searchZiomap } from '../src/services/places.service.js';

// Gỡ stub, khôi phục mock và xóa cache sau mỗi test để kết quả không rò sang test khác.
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); clearZiomapCache(); });

// API key phải gửi qua header x-api-key, không đặt trong URL (tránh lộ key qua log/proxy).
it('resolves a Google photo name using the configured provider without exposing its key in the URL', async () => {
  vi.stubEnv('ZIOMAP_API_KEY', 'photo-test-key');
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ photoUri: 'https://lh3.googleusercontent.com/place-photo' }) });
  vi.stubGlobal('fetch', fetch);
  const url = await resolvePlacePhoto({ placeId: 'place-1', photo: { name: 'places/place-1/photos/photo-1' } });
  expect(url).toBe('https://lh3.googleusercontent.com/place-photo');
  expect(fetch.mock.calls[0][0]).not.toContain('photo-test-key');
  expect(fetch.mock.calls[0][1].headers['x-api-key']).toBe('photo-test-key');
  vi.unstubAllEnvs();
});

// Khi deadline dùng chung đã hết thì không được mở thêm request ảnh.
it('does not start a photo request after the shared deadline has expired', async () => {
  vi.stubEnv('ZIOMAP_API_KEY', 'photo-test-key');
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const signal = AbortSignal.abort();
  expect(await resolvePlacePhoto({ placeId: 'place-1', photo: { name: 'places/place-1/photos/photo-1' }, signal })).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

// Nhiều ảnh chậm được xử lý song song nhưng tối đa 2 kết nối cùng lúc để không quá tải nhà cung cấp.
it('resolves multiple slow photos concurrently while limiting network connections to two', async () => {
  vi.stubEnv('ZIOMAP_API_KEY', 'photo-test-key');
  let active = 0, peak = 0;
  const places = Array.from({ length: 4 }, (_, index) => ({ id: `place-${index}`,
    displayName: { text: `Restaurant fixture ${index}` }, location: { latitude: 0, longitude: 0 },
    photos: [{ name: `places/place-${index}/photos/photo-${index}` }] }));
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (url.includes('/text-search')) return { ok: true, json: async () => ({ places }) };
    peak = Math.max(peak, ++active);
    await new Promise((resolve) => setTimeout(resolve, 20));
    active--;
    return { ok: true, json: async () => ({ photoUri: null }) };
  }));
  const result = await searchZiomap({ query: 'photo concurrency fixture', lat: 0, lng: 0, radiusKm: 1, limit: 4 });
  expect(result.places).toHaveLength(4);
  expect(peak).toBe(2);
  expect(result.places.every((place) => place.image_url === null)).toBe(true);
});

// Không mượn ảnh của địa điểm khác (photo name không khớp placeId) và không bịa ảnh khi nhà cung cấp lỗi.
it('does not borrow another place photo or invent a photo when the provider fails', async () => {
  vi.stubEnv('ZIOMAP_API_KEY', 'photo-test-key');
  const fetch = vi.fn().mockRejectedValue(new Error('Offline'));
  vi.stubGlobal('fetch', fetch);
  expect(await resolvePlacePhoto({ placeId: 'place-1', photo: { name: 'places/other-place/photos/photo-1' } })).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  expect(await resolvePlacePhoto({ placeId: 'place-1', photo: { name: 'places/place-1/photos/photo-1' } })).toBeNull();
  vi.unstubAllEnvs();
});

// Khi request ảnh bị treo, vẫn trả danh sách nhà hàng trong một deadline chung (ảnh = null) thay vì chờ vô hạn.
it('returns valid restaurants within one shared photo deadline when photo requests hang', async () => {
  vi.stubEnv('ZIOMAP_API_KEY', 'photo-test-key');
  let photoRequests = 0;
  const places = Array.from({ length: 4 }, (_, index) => ({ id: `deadline-${index}`, displayName: { text: `Restaurant fixture ${index}` },
    location: { latitude: 0, longitude: 0 }, photos: [{ name: `places/deadline-${index}/photos/image` }] }));
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    if (url.includes('/text-search')) return { ok: true, json: async () => ({ places }) };
    photoRequests++;
    return new Promise((_, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('Photo deadline exceeded')), { once: true });
    });
  }));
  const started = Date.now();
  const result = await searchZiomap({ query: 'photo deadline fixture', lat: 0, lng: 0, radiusKm: 1, limit: 4 });
  expect(Date.now() - started).toBeLessThan(4500);
  expect(photoRequests).toBe(2);
  expect(result.places).toHaveLength(4);
  expect(result.places.every((place) => place.image_url === null)).toBe(true);
});
