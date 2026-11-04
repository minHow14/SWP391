// D:/SWP391/SWP391/client/test/dietaryContract.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMealPlanRequest, dietTypeToAi, mealPlanDefaults } from '../src/utils/aiHelpers.js';
import { analyzeIngredients } from '../src/utils/foodScanner.js';

const DIETS = ['vegan', 'lacto', 'ovo', 'lacto_ovo', 'buddhist', 'keto', 'eat_clean'];
test('all seven persisted diets retain their identities in chat and meal requests', () => {
  for (const [index, dietaryType] of DIETS.entries()) {
    assert.equal(dietTypeToAi(index + 1), dietaryType);
    const defaults = mealPlanDefaults({ user: { health_profile: { diet_type_id: index + 1 } } });
    assert.equal(defaults.dietaryType, dietaryType);
    assert.equal(buildMealPlanRequest(defaults).dietaryType, dietaryType);
  }
});

test('meal defaults retain nested saved allergy names even without a catalog match', () => {
  const user = { allergies: [{ ingredient_id: 91, ingredient: { name: 'Đậu phộng' } }] };
  assert.deepEqual(mealPlanDefaults({ user }).allergies, ['Đậu phộng']);
});

test('Buddhist text checks exclude animal products and all five supplied alliums', () => {
  const result = analyzeIngredients('sữa tươi, trứng, mật ong, hành, tỏi, hẹ, kiệu, nén', 5);
  assert.equal(result.findings.length, 8);
});
