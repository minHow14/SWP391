// client/test/foodScanner.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeIngredients } from '../src/utils/foodScanner.js';
const scanDemo={ingredients:'Bún tươi, đậu hũ chiên, nấm rơm, chả chay, sa tế tôm, nước mắm cá cơm, bột nêm chiết xuất xương heo, ngò gai, sả'};

test('sample identifies all three hidden animal ingredients', () => {
  const result = analyzeIngredients(scanDemo.ingredients, 1);
  assert.equal(result.status, 'warning');
  assert.deepEqual(result.findings.map((item) => item.ingredient), [
    'sa tế tôm', 'nước mắm cá cơm', 'bột nêm chiết xuất xương heo',
  ]);
});

test('egg and dairy rules follow each vegetarian diet', () => {
  const text = 'trứng gà, sữa tươi';
  assert.equal(analyzeIngredients(text, 1).findings.length, 2);
  assert.deepEqual(analyzeIngredients(text, 2).findings.map((item) => item.ingredient), ['trứng gà']);
  assert.deepEqual(analyzeIngredients(text, 3).findings.map((item) => item.ingredient), ['sữa tươi']);
  assert.equal(analyzeIngredients(text, 4).status, 'clear');
});

test('plant substitutes and common vegetable names do not trigger animal keywords', () => {
  assert.equal(analyzeIngredients('Sữa đậu nành, nước mắm chay, thịt chay, nấm đùi gà, đậu gà, cà chua, cà rốt, bơ thực vật', 1).status, 'clear');
});

test('Buddhist rules check alliums only for that diet', () => {
  assert.equal(analyzeIngredients('Hành, tỏi, hẹ', 1).status, 'clear');
  assert.equal(analyzeIngredients('Hành, tỏi, hẹ', 5).findings.length, 3);
});

test('derivatives and honey are detected and delimiters work', () => {
  assert.equal(analyzeIngredients('gelatin; whey\nmật ong', 1).findings.length, 3);
  assert.equal(analyzeIngredients('sua tuoi; trung', 1).findings.length, 2);
});

test('Keto and Eat Clean require their own scanner rules', () => {
  assert.equal(analyzeIngredients(scanDemo.ingredients, 6).status, 'unknown');
  assert.equal(analyzeIngredients(scanDemo.ingredients, 7).status, 'unknown');
});
