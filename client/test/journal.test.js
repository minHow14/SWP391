// client/test/journal.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { totals, todayKey, weekDates } from '../src/utils/journal.js';

test('journal uses Bangkok calendar day around UTC midnight', () => {
  assert.equal(todayKey(new Date('2026-10-10T18:00:00Z')), '2026-10-11');
  assert.equal(todayKey(new Date('2026-10-10T16:59:00Z')), '2026-10-10');
});
test('week starts Monday and crosses month and year boundaries', () => {
  assert.deepEqual(weekDates('2027-01-01'), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
});
test('daily totals reflect adding and removing meals', () => {
  const meals = [{calories:420,protein:18,carbs:55,fat:12,fiber:8},{calories:550,protein:22,carbs:70,fat:14,fiber:12},{calories:280,protein:12,carbs:40,fat:9,fiber:8}];
  assert.deepEqual(totals(meals), { calories: 1250, protein: 52, carbs: 165, fat: 35, fiber: 28 });
  assert.equal(totals([...meals, { calories: 100, protein: 2, carbs: 10, fat: 1, fiber: 2 }]).calories, 1350);
  assert.equal(totals(meals.slice(1)).calories, 830);
  assert.equal(totals([]).calories, 0);
});

