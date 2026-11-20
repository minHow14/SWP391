// D:/SWP391/SWP391/client/test/restaurantImage.test.js
// Kiểm thử (node:test) các tiện ích ảnh dự phòng của quán: phân loại quán, chữ cái đại diện, nhãn trợ năng và từ chối ảnh stock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRestaurantCategory,
  getRestaurantInitial,
  getRestaurantFallbackAriaLabel,
} from '../src/features/restaurants/utils/restaurantImageHelpers.js';
import { resolveRestaurantPhoto } from '../src/features/restaurants/utils/nearbyHelpers.js';

// Nhận diện quán chay Phật giáo theo type hoặc dietTypeId 5.
test('resolveRestaurantCategory correctly identifies Buddhist vegetarian restaurants', () => {
  assert.equal(resolveRestaurantCategory({ type: 'buddhist' }), 'buddhist');
  assert.equal(resolveRestaurantCategory({ dietTypeId: 5 }), 'buddhist');
  assert.equal(resolveRestaurantCategory({ type: 'buddhist', dietTypeId: 5 }), 'buddhist');
});

// Nhận diện quán thuần chay theo type hoặc dietTypeId 1.
test('resolveRestaurantCategory correctly identifies Vegan restaurants', () => {
  assert.equal(resolveRestaurantCategory({ type: 'vegan' }), 'vegan');
  assert.equal(resolveRestaurantCategory({ dietTypeId: 1 }), 'vegan');
  assert.equal(resolveRestaurantCategory({ type: 'vegan', dietTypeId: 1 }), 'vegan');
});

// Cửa hàng thực phẩm chay được ưu tiên phân loại là "shop" kể cả khi có type khác.
test('resolveRestaurantCategory correctly identifies Vegetarian Grocery / Food shops', () => {
  assert.equal(resolveRestaurantCategory({ isShop: true }), 'shop');
  assert.equal(resolveRestaurantCategory({ type: 'shop' }), 'shop');
  assert.equal(resolveRestaurantCategory({ isShop: true, type: 'vegan' }), 'shop');
});

// Không xác định được thì quay về loại bếp chay chung ("separate").
test('resolveRestaurantCategory falls back to separate/general vegetarian kitchen', () => {
  assert.equal(resolveRestaurantCategory({ type: 'separate' }), 'separate');
  assert.equal(resolveRestaurantCategory({}), 'separate');
  assert.equal(resolveRestaurantCategory(null), 'separate');
  assert.equal(resolveRestaurantCategory(undefined), 'separate');
});

// Lấy chữ cái đầu viết hoa, bỏ khoảng trắng thừa.
test('getRestaurantInitial extracts clean uppercase initial letter', () => {
  assert.equal(getRestaurantInitial('An Duyên'), 'A');
  assert.equal(getRestaurantInitial('an duyên'), 'A');
  assert.equal(getRestaurantInitial('  Sen Vàng  '), 'S');
  assert.equal(getRestaurantInitial('Thiện Tâm'), 'T');
});

// Tên rỗng thì dùng tên dự phòng; không có gì thì dùng "Q" (quán), không gây lỗi.
test('getRestaurantInitial falls back gracefully without crashing', () => {
  assert.equal(getRestaurantInitial('', 'Bồ Đề Quán'), 'B');
  assert.equal(getRestaurantInitial(null, 'Diệu Hạnh'), 'D');
  assert.equal(getRestaurantInitial(null, null), 'Q');
  assert.equal(getRestaurantInitial('   ', '   '), 'Q');
});

// Nhãn trợ năng mô tả rõ quán chưa có ảnh thực tế.
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

// Ảnh stock giả bị từ chối để giao diện chuyển sang ảnh dự phòng theo loại quán.
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
