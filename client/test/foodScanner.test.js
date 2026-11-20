// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/foodScanner.test.js
// Kiểm thử (node:test) bộ phân tích thành phần dạng văn bản: phát hiện thành phần động vật ẩn theo từng kiểu ăn chay.
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeIngredients } from '../src/utils/foodScanner.js';
// Danh sách thành phần mẫu có lẫn ba thành phần gốc động vật khó nhận ra.
const scanDemo={ingredients:'Bún tươi, đậu hũ chiên, nấm rơm, chả chay, sa tế tôm, nước mắm cá cơm, bột nêm chiết xuất xương heo, ngò gai, sả'};

// Mẫu thử phải phát hiện đủ ba thành phần động vật ẩn.
test('sample identifies all three hidden animal ingredients', () => {
  const result = analyzeIngredients(scanDemo.ingredients, 1);
  assert.equal(result.status, 'warning');
  assert.deepEqual(result.findings.map((item) => item.ingredient), [
    'sa tế tôm', 'nước mắm cá cơm', 'bột nêm chiết xuất xương heo',
  ]);
});

// Quy tắc về trứng và sữa phải áp dụng đúng cho từng kiểu ăn chay.
test('egg and dairy rules follow each vegetarian diet', () => {
  const text = 'trứng gà, sữa tươi';
  assert.equal(analyzeIngredients(text, 1).findings.length, 2);
  assert.deepEqual(analyzeIngredients(text, 2).findings.map((item) => item.ingredient), ['trứng gà']);
  assert.deepEqual(analyzeIngredients(text, 3).findings.map((item) => item.ingredient), ['sữa tươi']);
  assert.equal(analyzeIngredients(text, 4).status, 'clear');
});

// Đồ chay thay thế và tên rau củ phổ biến (nấm đùi gà, đậu gà...) không được bị nhận nhầm là thành phần động vật.
test('plant substitutes and common vegetable names do not trigger animal keywords', () => {
  assert.equal(analyzeIngredients('Sữa đậu nành, nước mắm chay, thịt chay, nấm đùi gà, đậu gà, cà chua, cà rốt, bơ thực vật', 1).status, 'clear');
});

// Quy tắc hành tỏi chỉ áp dụng cho chay Phật giáo.
test('Buddhist rules check alliums only for that diet', () => {
  assert.equal(analyzeIngredients('Hành, tỏi, hẹ', 1).status, 'clear');
  assert.equal(analyzeIngredients('Hành, tỏi, hẹ', 5).findings.length, 3);
});

// Phát hiện được chất dẫn xuất (gelatin, whey), mật ong, và tách đúng theo nhiều loại dấu phân cách, kể cả không dấu.
test('derivatives and honey are detected and delimiters work', () => {
  assert.equal(analyzeIngredients('gelatin; whey\nmật ong', 1).findings.length, 3);
  assert.equal(analyzeIngredients('sua tuoi; trung', 1).findings.length, 2);
});

// Keto và Eat Clean cần bộ quy tắc riêng nên trả trạng thái chưa xác định.
test('Keto and Eat Clean require their own scanner rules', () => {
  assert.equal(analyzeIngredients(scanDemo.ingredients, 6).status, 'unknown');
  assert.equal(analyzeIngredients(scanDemo.ingredients, 7).status, 'unknown');
});

// Quả bơ, bơ thực vật và hạnh nhân không bị nhầm với thịt bò hay hành.
test('avocado, butter and almonds are not mistaken for beef or onion', () => {
  assert.equal(analyzeIngredients('bơ, bơ sáp, hạnh nhân, hạt hạnh nhân, sữa hạnh nhân', 5).status, 'clear');
  assert.equal(analyzeIngredients('thịt bò, bò kho', 1).findings.length, 2);
  assert.deepEqual(analyzeIngredients('hành lá, hành tím', 5).findings.map((item) => item.layer), [4, 4]);
  assert.equal(analyzeIngredients('hành lá, hành tím', 1).status, 'clear');
});
