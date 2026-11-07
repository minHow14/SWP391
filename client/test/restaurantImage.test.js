// D:/SWP391/SWP391/client/test/restaurantImage.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRestaurantCategory,
  getRestaurantInitial,
  getRestaurantFallbackAriaLabel,
} from '../src/features/restaurants/utils/restaurantImageHelpers.js';
import { resolveRestaurantPhoto } from '../src/features/restaurants/utils/nearbyHelpers.js';

test('resolveRestaurantCategory correctly identifies Buddhist vegetarian restaurants', () => {
  assert.equal(resolveRestaurantCategory({ type: 'buddhist' }), 'buddhist');
  assert.equal(resolveRestaurantCategory({ dietTypeId: 5 }), 'buddhist');
  assert.equal(resolveRestaurantCategory({ type: 'buddhist', dietTypeId: 5 }), 'buddhist');
});

test('resolveRestaurantCategory correctly identifies Vegan restaurants', () => {
  assert.equal(resolveRestaurantCategory({ type: 'vegan' }), 'vegan');
  assert.equal(resolveRestaurantCategory({ dietTypeId: 1 }), 'vegan');
  assert.equal(resolveRestaurantCategory({ type: 'vegan', dietTypeId: 1 }), 'vegan');
});

test('resolveRestaurantCategory correctly identifies Vegetarian Grocery / Food shops', () => {
  assert.equal(resolveRestaurantCategory({ isShop: true }), 'shop');
  assert.equal(resolveRestaurantCategory({ type: 'shop' }), 'shop');
  assert.equal(resolveRestaurantCategory({ isShop: true, type: 'vegan' }), 'shop');
});

test('resolveRestaurantCategory falls back to separate/general vegetarian kitchen', () => {
  assert.equal(resolveRestaurantCategory({ type: 'separate' }), 'separate');
  assert.equal(resolveRestaurantCategory({}), 'separate');
  assert.equal(resolveRestaurantCategory(null), 'separate');
  assert.equal(resolveRestaurantCategory(undefined), 'separate');
});

test('getRestaurantInitial extracts clean uppercase initial letter', () => {
  assert.equal(getRestaurantInitial('An Duyên'), 'A');
  assert.equal(getRestaurantInitial('an duyên'), 'A');
  assert.equal(getRestaurantInitial('  Sen Vàng  '), 'S');
  assert.equal(getRestaurantInitial('Thiện Tâm'), 'T');
});

test('getRestaurantInitial falls back gracefully without crashing', () => {
  assert.equal(getRestaurantInitial('', 'Bồ Đề Quán'), 'B');
  assert.equal(getRestaurantInitial(null, 'Diệu Hạnh'), 'D');
  assert.equal(getRestaurantInitial(null, null), 'Q');
  assert.equal(getRestaurantInitial('   ', '   '), 'Q');
});

test('getRestaurantFallbackAriaLabel produces descriptive accessibility text', () => {
  assert.equal(
    getRestaurantFallbackAriaLabel('Cơm Chay Giác Ngộ'),
    'Chưa có ảnh thực tế của Cơm Chay Giác Ngộ'
  );
  assert.equal(
    getRestaurantFallbackAriaLabel('', 'Quán Sen'),
    'Chưa có ảnh thực tế của Quán Sen'
  );
  assert.equal(
    getRestaurantFallbackAriaLabel(null, null),
    'Chưa có ảnh thực tế của quán'
  );
});

test('resolveRestaurantPhoto strictly rejects fake stock photos so fallback triggers', () => {
  const stockPhotoPlace = {
    name: 'Quán Chay Giả Lập',
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999',
  };
  const resolvedPhoto = resolveRestaurantPhoto(stockPhotoPlace);
  assert.equal(resolvedPhoto, null);

  // Khi resolvedPhoto là null, component chuyển sang fallback category tương ứng
  const category = resolveRestaurantCategory({ type: 'vegan', dietTypeId: 1 });
  assert.equal(category, 'vegan');
  const initial = getRestaurantInitial(stockPhotoPlace.name);
  assert.equal(initial, 'Q');
});
