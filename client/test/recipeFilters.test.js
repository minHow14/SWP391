// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/recipeFilters.test.js
// Kiểm thử (node:test) filterRecipes: tìm kiếm không dấu theo tên/nguyên liệu, lọc theo danh mục và theo kiểu ăn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterRecipes } from '../src/utils/recipeFilters.js';

// Ba công thức mẫu với kiểu ăn tương thích khác nhau (thuần chay, có sữa, có trứng).
const recipes = [
  {
    recipe_id: 1,
    recipe_name: 'Đậu Hũ Kho',
    category_id: 1,
    ingredients: ['Nấm đông cô'],
    compatible_diet_type_ids: [1, 2, 5],
  },
  {
    recipe_id: 2,
    recipe_name: 'Súp Phô Mai',
    category_id: 3,
    ingredients: ['Nấm mỡ', 'Sữa'],
    compatible_diet_type_ids: [2],
  },
  {
    recipe_id: 3,
    recipe_name: 'Bánh Mì Trứng',
    category_id: 5,
    ingredients: ['Trứng'],
    compatible_diet_type_ids: [3],
  },
];

// Tìm kiếm bỏ qua dấu và chữ hoa, và khớp cả theo nguyên liệu.
test('recipe search ignores accents and matches ingredients', () => {
  assert.deepEqual(
    filterRecipes(recipes, { query: 'DAU HU' }).map((item) => item.recipe_id),
    [1]
  );
  assert.deepEqual(
    filterRecipes(recipes, { query: 'nam' }).map((item) => item.recipe_id),
    [1, 2]
  );
});
// Lọc tự động theo Thuần chay phải loại món có trứng và sữa.
test('automatic vegan filter excludes eggs and dairy', () => {
  assert.deepEqual(
    filterRecipes(recipes, { matchDiet: true, diet_type_id: 1 }).map(
      (item) => item.recipe_id
    ),
    [1]
  );
});
// Các bộ lọc tìm kiếm, danh mục và kiểu ăn được kết hợp với nhau (điều kiện AND).
test('search, category and diet filters combine', () => {
  assert.deepEqual(
    filterRecipes(recipes, {
      query: 'nam',
      category_id: 3,
      matchDiet: true,
      diet_type_id: 2,
    }).map((item) => item.recipe_id),
    [2]
  );
  assert.equal(
    filterRecipes(recipes, {
      category_id: 5,
      matchDiet: true,
      diet_type_id: 1,
    }).length,
    0
  );
});
// Keto và Eat Clean không được bỏ qua phân loại; chỉ món được gắn đúng kiểu ăn mới hiện ra.
test('Keto and Eat Clean do not bypass dietary classification', () => {
  assert.equal(
    filterRecipes(recipes, { matchDiet: true, diet_type_id: 6 }).length,
    0
  );
  const classified = [{ ...recipes[0], compatible_diet_type_ids: [6] }, { ...recipes[1], compatible_diet_type_ids: [7] }];
  assert.deepEqual(filterRecipes(classified,{matchDiet:true,diet_type_id:6}).map(r=>r.recipe_id),[1]);
  assert.deepEqual(filterRecipes(classified,{matchDiet:true,diet_type_id:7}).map(r=>r.recipe_id),[2]);
});
