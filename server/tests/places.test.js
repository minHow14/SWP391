import { test, beforeEach, afterEach, afterAll, vi } from 'vitest';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import placesRoutes from '../src/routes/places.route.js';
import { clearZiomapCache, normalize } from '../src/services/places.service.js';
import prisma from '../src/config/prisma.js';

// Fixed records isolate route/search tests from the user's live database.
const fixtures=Array.from({length:7},(_,index)=>({restaurant_id:index+1,name:`Quán Chay Kiểm Thử ${index+1}`,address:'Quận 1, TP.HCM',latitude:10.7769+index*.002,longitude:106.7009,phone:null,rating:4.5,image_url:null,diet_type_id:1,diet_type:{name:'Vegan'},restaurant_recipes:([{recipe:{recipe_name:'Đậu hũ kho'}}]).concat([1,3,4,7].includes(index+1)?[{recipe:{recipe_name:'Salad Bơ'}}]:[])}));
const app = express();
app.use('/api/places', placesRoutes);

const DISTRICT_1 = { lat: 10.7769, lng: 106.7009 };
const FAR_AWAY = { lat: 16.0544, lng: 108.2022 }; // Đà Nẵng, ngoài vùng có quán trong DB
const TEST_KEY = 'test-ziomap-key';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.spyOn(prisma.restaurant,'findMany').mockResolvedValue(fixtures);
  clearZiomapCache();
  delete process.env.ZIOMAP_API_KEY;
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
  delete process.env.ZIOMAP_API_KEY;
});

afterAll(async () => {
  await prisma.$disconnect();
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
  const res = await request(app).get('/api/places/search').query({ q: 'salad', ...DISTRICT_1 });
  assert.equal(res.status, 200);
  const places = res.body.data.places;
  const withSalad = places.filter((p) => p.matched_dishes.some((d) => d.includes('Salad')));
  assert.deepEqual(
    withSalad.map((p) => p.restaurant_id).sort(),
    [1, 3, 4, 7]
  );
  assert.ok(places.every((p) => p.distance_m !== null));
});

test('search bỏ từ chung "chay": chỉ trả quán thật sự có món', async () => {
  const res = await request(app).get('/api/places/search').query({ q: 'salad chay', ...DISTRICT_1 });
  assert.equal(res.status, 200);
  const places = res.body.data.places;
  assert.ok(places.length >= 2);
  assert.ok(places.every((p) => p.matched_dishes.length > 0), JSON.stringify(places.map((p) => p.name)));
});

test('search chỉ có từ chung vẫn tìm theo tên quán', async () => {
  const res = await request(app).get('/api/places/search').query({ q: 'chay' });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.places.length > 0);
});

test('search chỉ cần từ khoá, không bắt buộc vị trí', async () => {
  const res = await request(app).get('/api/places/search').query({ q: 'dau hu' });
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
        displayName: { text: 'Quán Chay Đà Nẵng' },
        formattedAddress: '1 Bạch Đằng, Đà Nẵng',
        location: { latitude: 16.0540, longitude: 108.2020 },
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

test('chỉ xin ZIOMAP đúng số quán còn thiếu so với DB', async () => {
  process.env.ZIOMAP_API_KEY = TEST_KEY;
  let requested;
  globalThis.fetch = async (url) => {
    requested = new URL(url).searchParams.get('maxResultCount');
    return ziomapReply([])();
  };
  // Bán kính 1.5 km quanh Quận 1 có 2 quán trong DB (Hum Vegetarian & Thiền Tâm)
  const res = await request(app).get('/api/places/nearby').query({ ...DISTRICT_1, radius_km: 1.5, limit: 10 });
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
      location: { latitude: 16.0540, longitude: 108.2020 }, // ~50 m
    },
    {
      id: 'far',
      displayName: { text: 'Quán xa' },
      location: { latitude: 16.5, longitude: 108.5 }, // ~60 km
    },
  ]);
  const res = await request(app).get('/api/places/nearby').query({ ...FAR_AWAY, radius_km: 2 });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.places.map((p) => p.place_id), ['near']);
});

test('quán ZIOMAP thiếu toạ độ bị bỏ qua, không làm hỏng response', async () => {
  process.env.ZIOMAP_API_KEY = TEST_KEY;
  globalThis.fetch = ziomapReply([
    { id: 'no_location', displayName: { text: 'Thiếu toạ độ' } },
    { id: 'bad', displayName: { text: 'Sai toạ độ' }, location: { latitude: 'x', longitude: 1 } },
    { id: 'ok', displayName: { text: 'Hợp lệ' }, location: { latitude: 16.0540, longitude: 108.2020 } },
  ]);
  const res = await request(app).get('/api/places/nearby').query({ ...FAR_AWAY, radius_km: 2 });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.places.map((p) => p.place_id), ['ok']);
});

test('ZIOMAP trả trang không phải JSON thì vẫn dùng kết quả DB', async () => {
  process.env.ZIOMAP_API_KEY = TEST_KEY;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('Unexpected token <');
    },
  });
  const res = await request(app).get('/api/places/nearby').query({ ...DISTRICT_1, radius_km: 5, limit: 20 });
  assert.equal(res.status, 200);
  assert.equal(res.body.meta.ziomap, 'unavailable');
  assert.ok(res.body.data.places.length > 0);
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
