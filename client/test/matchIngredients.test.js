// D:/SWP391/SWP391/client/test/matchIngredients.test.js
// Kiểm thử (node:test) hàm matchIngredients: đối chiếu tên nguyên liệu AI nhận diện với danh mục nguyên liệu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { matchIngredients } from '../src/features/ingredients/utils/matchIngredients.js';

// Danh mục nhỏ có các nguyên liệu tên gần giống nhau và bí danh tiếng Anh.
const catalog = [
  { id: 1, name: 'Đậu hũ non', aliases: 'tofu silken đậu phụ non tàu hũ' },
  { id: 2, name: 'Đậu hũ chiên', aliases: 'fried tofu đậu phụ rán' },
  { id: 3, name: 'Nấm đùi gà', aliases: 'king oyster mushroom pleurotus' },
  { id: 4, name: 'Cà chua', aliases: 'tomato' },
];
// Lấy danh sách tên từ kết quả đối chiếu để so sánh cho gọn.
const names = (found) => found.map((item) => item.name);

// Khớp tên chính xác dù không dấu hoặc kèm khối lượng/số lượng.
test('matches exact names without accents or quantities', () => {
  assert.deepEqual(names(matchIngredients(['Đậu hũ non (150g)', 'ca chua 2 quả'], catalog)), ['Đậu hũ non', 'Cà chua']);
});

// Ưu tiên nguyên liệu cụ thể nhất và loại bỏ kết quả trùng lặp.
test('prefers the most specific ingredient and removes duplicates', () => {
  assert.deepEqual(names(matchIngredients(['đậu hũ chiên giòn', 'Đậu hũ chiên', 'đậu hũ chiên'], catalog)), ['Đậu hũ chiên']);
});

// Khớp được theo bí danh và tên tiếng Anh.
test('matches aliases and English names', () => {
  assert.deepEqual(names(matchIngredients(['tofu silken', 'tomato', 'đậu phụ rán'], catalog)), ['Đậu hũ non', 'Cà chua', 'Đậu hũ chiên']);
});

// Bỏ qua từ quá ngắn hoặc không có trong danh mục.
test('ignores terms that are too short or unknown', () => {
  assert.deepEqual(matchIngredients(['gà', 'xx', 'Sầu riêng', ''], catalog), []);
});
