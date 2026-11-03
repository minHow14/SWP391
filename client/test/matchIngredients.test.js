// D:/SWP391/SWP391/client/test/matchIngredients.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { matchIngredients } from '../src/features/ingredients/utils/matchIngredients.js';

const catalog = [
  { id: 1, name: 'Đậu hũ non', aliases: 'tofu silken đậu phụ non tàu hũ' },
  { id: 2, name: 'Đậu hũ chiên', aliases: 'fried tofu đậu phụ rán' },
  { id: 3, name: 'Nấm đùi gà', aliases: 'king oyster mushroom pleurotus' },
  { id: 4, name: 'Cà chua', aliases: 'tomato' },
];
const names = (found) => found.map((item) => item.name);

test('matches exact names without accents or quantities', () => {
  assert.deepEqual(names(matchIngredients(['Đậu hũ non (150g)', 'ca chua 2 quả'], catalog)), ['Đậu hũ non', 'Cà chua']);
});

test('prefers the most specific ingredient and removes duplicates', () => {
  assert.deepEqual(names(matchIngredients(['đậu hũ chiên giòn', 'Đậu hũ chiên', 'đậu hũ chiên'], catalog)), ['Đậu hũ chiên']);
});

test('matches aliases and English names', () => {
  assert.deepEqual(names(matchIngredients(['tofu silken', 'tomato', 'đậu phụ rán'], catalog)), ['Đậu hũ non', 'Cà chua', 'Đậu hũ chiên']);
});

test('ignores terms that are too short or unknown', () => {
  assert.deepEqual(matchIngredients(['gà', 'xx', 'Sầu riêng', ''], catalog), []);
});
