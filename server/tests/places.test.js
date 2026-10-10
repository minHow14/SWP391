import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import { clearZiomapCache, normalize } from '../services/PlacesService.js';

const DISTRICT_1 = { lat: 10.7769, lng: 106.7009 };
const FAR_AWAY = { lat: 21.0285, lng: 105.8542 }; // Hà Nội, ngoài vùng có quán trong DB
const TEST_KEY = 'test-ziomap-key';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  clearZiomapCache();
  delete process.env.ZIOMAP_API_KEY;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.ZIOMAP_API_KEY;
});

const ziomapReply = (places) => async () => ({ ok: true, status: 200, json: async () => ({ places }) });

test('normalize bỏ dấu tiếng Việt', () => {
  assert.equal(normalize('Phở Chay Đặc Biệt'), 'pho chay dac biet');
});

test('nearby trả quán trong bán kính, xếp từ gần đến xa, theo envelope chuẩn', async () => {
  const res = await request(app).get('/api/places/nearby').query({ ...DISTRICT_1, radius_km: 3, limit: 20 });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.match(res.body.meta.requestId, /^req_/);
  assert.equal(res.headers['x-request-id'], res.body.meta.requestId);
  assert.equal(res.body.meta.ziomap, 'not_configured');

  const places = res.body.data.places;
  assert.ok(places.length > 3);
  const distances = places.map((p) => p.distance_m);
  assert.deepEqual(distances, [...distances].sort((a, b) => a - b));
  assert.ok(distances.every((d) => d <= 3000));
  assert.ok(places.every((p) => p.maps_url.startsWith('https://www.google.com/maps/search/')));
});

test('nearby không gọi ZIOMAP khi DB đã đủ kết quả', async () => {
  process.env.ZIOMAP_API_KEY = TEST_KEY;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return ziomapReply([])();
  };
  const res = await request(app).get('/api/places/nearby').query({ ...DISTRICT_1, radius_km: 10, limit: 2 });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.places.length, 2);
  assert.equal(res.body.meta.ziomap, 'not_needed');
  assert.equal(calls, 0);
});

test('nearby thiếu hoặc sai toạ độ trả 400 INVALID_INPUT', async () => {
  for (const query of [{}, { lat: 10.7 }, { lat: 'abc', lng: 106 }, { lat: 200, lng: 106 }]) {
    const res = await request(app).get('/api/places/nearby').query(query);
    assert.equal(res.status, 400, JSON.stringify(query));
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_INPUT');
    assert.ok(res.body.meta.requestId);
  }
});

test('search tìm quán theo tên món không dấu và sắp xếp theo khoảng cách', async () => {
  const res = await request(app).get('/api/places/search').query({ q: 'pho chay', ...DISTRICT_1 });
  assert.equal(res.status, 200);
  const places = res.body.data.places;
  const withPho = places.filter((p) => p.matched_dishes.includes('Phở chay'));
  assert.deepEqual(
    withPho.map((p) => p.restaurant_id).sort(),
    [3, 6]
  );
  assert.ok(places.every((p) => p.distance_m !== null));
});

test('search chỉ cần từ khoá, không bắt buộc vị trí', async () => {
  const res = await request(app).get('/api/places/search').query({ q: 'bun rieu' });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.places.length >= 2);
  assert.ok(res.body.data.places.every((p) => p.distance_m === null));
});

test('search thiếu q hoặc chỉ có lat trả 400', async () => {
  assert.equal((await request(app).get('/api/places/search')).status, 400);
  const res = await request(app).get('/api/places/search').query({ q: 'chay', lat: 10.7 });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'INVALID_INPUT');
});

test('bổ sung từ ZIOMAP khi DB không có quán gần, kết quả được cache', async () => {
  process.env.ZIOMAP_API_KEY = TEST_KEY;
  let calls = 0;
  let sent;
  globalThis.fetch = async (url, options) => {
    calls += 1;
    sent = { url: new URL(url), headers: options.headers, method: options.method ?? 'GET' };
    return ziomapReply([
      {
        id: 'ChIJ_abc',
        displayName: { text: 'Quán Chay Hà Nội' },
        formattedAddress: '1 Hàng Bài, Hà Nội',
        location: { latitude: 21.0281, longitude: 105.8524 },
      },
    ])();
  };

  const first = await request(app).get('/api/places/nearby').query({ ...FAR_AWAY, radius_km: 2 });
  assert.equal(first.status, 200);
  assert.equal(first.body.meta.ziomap, 'used');
  const [place] = first.body.data.places;
  assert.equal(place.source, 'ziomap');
  assert.match(place.maps_url, /query_place_id=ChIJ_abc/);

  // Key gửi qua header x-api-key (không nằm trong URL), chỉ xin các trường cần thiết
  assert.equal(sent.method, 'GET');
  assert.equal(sent.url.pathname, '/api/place/text-search');
  assert.equal(sent.headers['x-api-key'], TEST_KEY);
  assert.ok(!sent.url.href.includes(TEST_KEY));
  assert.ok(sent.url.searchParams.get('fieldMask').includes('places.displayName'));
  assert.equal(sent.url.searchParams.get('languageCode'), 'vi');
  assert.equal(sent.url.searchParams.get('query'), 'quán chay');

  const second = await request(app).get('/api/places/nearby').query({ ...FAR_AWAY, radius_km: 2 });
  assert.equal(second.body.meta.ziomap, 'cached');
  assert.equal(calls, 1);
});

test('chỉ xin ZIOMAP đúng số quán còn thiếu so với DB (tính phí theo kết quả)', async () => {
  process.env.ZIOMAP_API_KEY = TEST_KEY;
  let requested;
  globalThis.fetch = async (url) => {
    requested = new URL(url).searchParams.get('maxResultCount');
    return ziomapReply([])();
  };
  // Bán kính 0.5 km quanh Quận 1 chỉ có vài quán trong DB
  const res = await request(app).get('/api/places/nearby').query({ ...DISTRICT_1, radius_km: 0.5, limit: 10 });
  assert.equal(res.status, 200);
  const local = res.body.data.places.length;
  assert.ok(local > 0 && local < 10);
  assert.equal(Number(requested), 10 - local);
});

test('nearby loại quán ZIOMAP nằm ngoài bán kính (locationBias không giới hạn vùng)', async () => {
  process.env.ZIOMAP_API_KEY = TEST_KEY;
  globalThis.fetch = ziomapReply([
    {
      id: 'near',
      displayName: { text: 'Quán gần' },
      location: { latitude: 21.0281, longitude: 105.8524 }, // ~200 m
    },
    {
      id: 'far',
      displayName: { text: 'Quán xa' },
      location: { latitude: 21.2, longitude: 106.0 }, // ~25 km
    },
  ]);
  const res = await request(app).get('/api/places/nearby').query({ ...FAR_AWAY, radius_km: 2 });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.places.map((p) => p.place_id), ['near']);
});

test('ZIOMAP lỗi mà DB không có kết quả thì trả 502 PLACES_PROVIDER_ERROR', async () => {
  process.env.ZIOMAP_API_KEY = TEST_KEY;
  globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({}) });
  const res = await request(app).get('/api/places/nearby').query({ ...FAR_AWAY, radius_km: 2 });
  assert.equal(res.status, 502);
  assert.equal(res.body.error.code, 'PLACES_PROVIDER_ERROR');
  assert.ok(res.body.meta.requestId);
});

test('ZIOMAP lỗi nhưng DB có kết quả thì vẫn trả 200 và báo unavailable', async () => {
  process.env.ZIOMAP_API_KEY = TEST_KEY;
  globalThis.fetch = async () => {
    throw new Error('network down');
  };
  const res = await request(app).get('/api/places/nearby').query({ ...DISTRICT_1, radius_km: 5, limit: 20 });
  assert.equal(res.status, 200);
  assert.equal(res.body.meta.ziomap, 'unavailable');
  assert.ok(res.body.data.places.length > 0);
});

test('search không có trong DB thì hỏi ZIOMAP kèm từ "chay"', async () => {
  process.env.ZIOMAP_API_KEY = TEST_KEY;
  let textQuery;
  globalThis.fetch = async (url) => {
    textQuery = new URL(url).searchParams.get('query');
    return ziomapReply([])();
  };
  const res = await request(app).get('/api/places/search').query({ q: 'lẩu thái', ...FAR_AWAY });
  assert.equal(res.status, 200);
  assert.equal(textQuery, 'lẩu thái chay');
});

test('X-Request-Id của client được giữ nguyên', async () => {
  const res = await request(app)
    .get('/api/places/nearby')
    .set('X-Request-Id', 'req_from_client')
    .query(DISTRICT_1);
  assert.equal(res.body.meta.requestId, 'req_from_client');
});

test('gợi ý quán của /api/recommendations dùng chung dữ liệu với places', async () => {
  const res = await request(app).get('/api/recommendations/suggest').query({ keyword: 'pho chay' });
  assert.equal(res.status, 200);
  assert.ok(res.body.recommendations.shops.length >= 2);
});
