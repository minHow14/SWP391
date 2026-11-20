// D:/SWP391/SWP391/client/test/dietaryContract.test.js
// Kiểm thử (node:test) hợp đồng chế độ ăn giữa client và AI: đủ 7 kiểu ăn, giữ tên dị ứng đã lưu và quy tắc ăn chay Phật giáo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMealPlanRequest, dietTypeToAi, mealPlanDefaults } from '../src/utils/aiHelpers.js';
import { analyzeIngredients } from '../src/utils/foodScanner.js';

// Bảy kiểu ăn đang lưu trong DB, theo thứ tự diet_type_id từ 1 đến 7.
const DIETS = ['vegan', 'lacto', 'ovo', 'lacto_ovo', 'buddhist', 'keto', 'eat_clean'];
// Mỗi kiểu ăn đã lưu phải giữ đúng định danh khi chuyển sang request chat và request lập thực đơn.
test('all seven persisted diets retain their identities in chat and meal requests', () => {
  for (const [index, dietaryType] of DIETS.entries()) {
    assert.equal(dietTypeToAi(index + 1), dietaryType);
    const defaults = mealPlanDefaults({ user: { health_profile: { diet_type_id: index + 1 } } });
    assert.equal(defaults.dietaryType, dietaryType);
    assert.equal(buildMealPlanRequest(defaults).dietaryType, dietaryType);
  }
});

// Giá trị mặc định của thực đơn phải giữ tên dị ứng lồng trong dữ liệu đã lưu, kể cả khi không khớp catalog.
test('meal defaults retain nested saved allergy names even without a catalog match', () => {
  const user = { allergies: [{ ingredient_id: 91, ingredient: { name: 'Đậu phộng' } }] };
  assert.deepEqual(mealPlanDefaults({ user }).allergies, ['Đậu phộng']);
});

// Chay Phật giáo phải loại cả sản phẩm động vật và đủ năm loại hành (ngũ vị tân).
test('Buddhist text checks exclude animal products and all five supplied alliums', () => {
  const result = analyzeIngredients('sữa tươi, trứng, mật ong, hành, tỏi, hẹ, kiệu, nén', 5);
  assert.equal(result.findings.length, 8);
});
