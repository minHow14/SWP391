// D:/SWP391/SWP391/client/test/restaurantSort.test.js
// Kiểm thử (node:test) compareRestaurantPrices: so sánh quán theo giá món thấp nhất đã lưu.
import assert from 'node:assert/strict';
import test from 'node:test';
import { compareRestaurantPrices } from '../src/features/restaurants/utils/restaurantSort.js';

// Sắp xếp theo giá món thấp nhất trong thực đơn, hỗ trợ cả giá dạng chuỗi có phần thập phân.
test('sorts restaurants by their lowest persisted menu price, including decimal strings', () => {
  const places = [
    { id: 'higher', price: '20.000 - 80.000', menu: [{ price: '90000' }, { price: '60000.50' }] },
    { id: 'lower', price: '20.000 - 80.000', menu: [{ price: '30000' }, { price: 20000 }] },
    { id: 'middle', menu: [{ price: 45000 }] },
  ];
  assert.deepEqual(places.sort(compareRestaurantPrices).map((place) => place.id), ['lower', 'middle', 'higher']);
});

// Giá thiếu hoặc không hợp lệ luôn ở cuối; null hay chuỗi trắng không được coi là món miễn phí (giá 0).
test('keeps missing and invalid prices last without treating null or whitespace as a free meal', () => {
  const places = [
    { id: 'unknown', price: 'Theo thời giá', menu: [{ price: null }, { price: '' }, { price: ' ' }, { price: -1 }, { price: Infinity }, { price: 'chưa cập nhật' }] },
    { id: 'missing' },
    { id: 'priced', menu: [{ price: 10000 }] },
    { id: 'free', menu: [{ price: 0 }] },
  ];
  assert.deepEqual(places.sort(compareRestaurantPrices).map((place) => place.id), ['free', 'priced', 'unknown', 'missing']);
});

// Không suy ra giá từ chuỗi mô tả khoảng giá tự do của quán.
test('does not infer a numeric price from arbitrary restaurant price-range prose', () => {
  assert.equal(compareRestaurantPrices({ price: '10.000 - 20.000đ', menu: [] }, { menu: [{ price: 50000 }] }) > 0, true);
  assert.equal(compareRestaurantPrices({}, { menu: [] }), 0);
});
