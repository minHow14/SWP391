// client/test/nearbyPlaces.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_HUBS,
  HCM_HUBS,
  RADIUS_OPTIONS,
  DIET_OPTIONS,
  checkIsOpenNow,
  getPosition,
  SAMPLE_RESTAURANT_PHOTOS,
  getSampleRestaurantPhoto,
  resolveRestaurantPhoto,
} from '../src/features/restaurants/utils/nearbyHelpers.js';
import { placeService } from '../src/services/placeService.js';
import apiClient from '../src/services/apiClient.js';

test('CITY_HUBS contains major Vietnam cities and valid district hubs with GPS coordinates', () => {
  assert.ok(Array.isArray(CITY_HUBS));
  assert.ok(CITY_HUBS.length >= 4);

  const cityIds = CITY_HUBS.map((c) => c.id);
  assert.ok(cityIds.includes('hcm'));
  assert.ok(cityIds.includes('hn'));
  assert.ok(cityIds.includes('dn'));

  for (const city of CITY_HUBS) {
    assert.ok(city.id && city.name);
    assert.ok(Array.isArray(city.hubs) && city.hubs.length > 0);
    for (const hub of city.hubs) {
      assert.ok(hub.id && hub.name);
      assert.ok(typeof hub.lat === 'number' && hub.lat >= -90 && hub.lat <= 90);
      assert.ok(typeof hub.lng === 'number' && hub.lng >= -180 && hub.lng <= 180);
    }
  }

  // HCM_HUBS backward compatibility export
  assert.equal(HCM_HUBS, CITY_HUBS[0].hubs);
});

test('RADIUS_OPTIONS and DIET_OPTIONS have expected values', () => {
  assert.deepEqual(RADIUS_OPTIONS, [3, 5, 10, 20]);
  assert.ok(Array.isArray(DIET_OPTIONS));
  assert.ok(DIET_OPTIONS.some((d) => d.id === null));
  assert.ok(DIET_OPTIONS.some((d) => d.id === 1)); // Vegan
  assert.ok(DIET_OPTIONS.some((d) => d.id === 5)); // Buddhist
});

test('checkIsOpenNow parses operating hours accurately', () => {
  const midDay = new Date('2026-10-26T12:00:00+07:00');
  const earlyMorning = new Date('2026-10-26T05:00:00+07:00');
  const lateNight = new Date('2026-10-26T23:30:00+07:00');

  assert.equal(checkIsOpenNow('07:00 - 21:00', midDay), true);
  assert.equal(checkIsOpenNow('07:00 - 21:00', earlyMorning), false);
  assert.equal(checkIsOpenNow('07:00 - 21:00', lateNight), false);
  assert.equal(checkIsOpenNow('Chưa cập nhật', midDay), null);
  assert.equal(checkIsOpenNow(null, midDay), null);
});

test('placeService.getNearbyPlaces constructs correct query params including dietTypeId and user GPS', async () => {
  let capturedUrl = '';
  let capturedOptions = null;
  const originalGet = apiClient.get;

  try {
    apiClient.get = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return { success: true, data: { places: [] } };
    };

    await placeService.getNearbyPlaces({
      lat: 10.7769,
      lng: 106.7009,
      userLat: 10.7500,
      userLng: 106.6800,
      radiusKm: 5,
      limit: 15,
      dietTypeId: 1,
    });

    assert.equal(capturedUrl, '/places/nearby');
    assert.deepEqual(capturedOptions.params, {
      lat: 10.7769,
      lng: 106.7009,
      user_lat: 10.7500,
      user_lng: 106.6800,
      radius_km: 5,
      limit: 15,
      diet_type_id: 1,
    });
  } finally {
    apiClient.get = originalGet;
  }
});

test('getPosition resolves with coordinates when geolocation succeeds', async () => {
  const mockNavigator = {
    geolocation: {
      getCurrentPosition: (success) => {
        success({ coords: { latitude: 10.7769, longitude: 106.7009 } });
      },
    },
  };
  const pos = await getPosition(mockNavigator);
  assert.deepEqual(pos, { lat: 10.7769, lng: 106.7009 });
});

test('getPosition rejects with user-friendly error when permission is denied', async () => {
  const mockNavigator = {
    geolocation: {
      getCurrentPosition: (_, error) => {
        error({ code: 1 });
      },
    },
  };
  await assert.rejects(
    getPosition(mockNavigator),
    /Bạn đã từ chối quyền truy cập vị trí trên trình duyệt/
  );
});

test('getPosition rejects when geolocation is unsupported', async () => {
  await assert.rejects(
    getPosition({}),
    /Trình duyệt không hỗ trợ định vị GPS/
  );
});

test('SAMPLE_RESTAURANT_PHOTOS has high quality vegetarian photos and resolveRestaurantPhoto resolves real vs sample photos', () => {
  assert.ok(Array.isArray(SAMPLE_RESTAURANT_PHOTOS));
  assert.ok(SAMPLE_RESTAURANT_PHOTOS.length >= 8);
  for (const url of SAMPLE_RESTAURANT_PHOTOS) {
    assert.ok(url.startsWith('https://images.unsplash.com/'));
  }

  // Quán có ảnh thật -> lấy đúng ảnh thật
  const placeWithRealPhoto = { name: 'Quán Chay An Lạc', image_url: 'https://my-real-restaurant.com/photo.jpg' };
  assert.equal(resolveRestaurantPhoto(placeWithRealPhoto), 'https://my-real-restaurant.com/photo.jpg');

  // Quán không có ảnh -> lấy ảnh mẫu từ danh sách mẫu
  const placeWithoutPhoto = { name: 'Quán Chay Sen Vàng', image_url: null };
  const fallback = resolveRestaurantPhoto(placeWithoutPhoto);
  assert.ok(SAMPLE_RESTAURANT_PHOTOS.includes(fallback));

  // Hai quán khác tên không có ảnh nhận ảnh mẫu xác định theo seed
  const fallback2 = resolveRestaurantPhoto({ name: 'Quán Chay Bồ Đề', image: '' });
  assert.ok(SAMPLE_RESTAURANT_PHOTOS.includes(fallback2));
});
