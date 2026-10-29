// client/test/recipeFilters.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterRecipes } from '../src/utils/recipeFilters.js';

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
test('automatic vegan filter excludes eggs and dairy', () => {
  assert.deepEqual(
    filterRecipes(recipes, { matchDiet: true, diet_type_id: 1 }).map(
      (item) => item.recipe_id
    ),
    [1]
  );
});
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
test('Keto and Eat Clean do not bypass dietary classification', () => {
  assert.equal(
    filterRecipes(recipes, { matchDiet: true, diet_type_id: 6 }).length,
    0
  );
  const classified = [{ ...recipes[0], compatible_diet_type_ids: [6] }, { ...recipes[1], compatible_diet_type_ids: [7] }];
  assert.deepEqual(filterRecipes(classified,{matchDiet:true,diet_type_id:6}).map(r=>r.recipe_id),[1]);
  assert.deepEqual(filterRecipes(classified,{matchDiet:true,diet_type_id:7}).map(r=>r.recipe_id),[2]);
});
