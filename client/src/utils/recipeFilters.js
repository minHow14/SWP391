// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/utils/recipeFilters.js
export function normalizeSearch(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

export function filterRecipes(
  recipes,
  { query = '', category_id = null, matchDiet = false, diet_type_id }
) {
  const search = normalizeSearch(query.trim());
  return recipes.filter(
    (recipe) =>
      (category_id === null || recipe.category_id === category_id) &&
      (!matchDiet ||
        recipe.compatible_diet_type_ids.includes(diet_type_id)) &&
      (!search ||
        normalizeSearch(
          `${recipe.recipe_name} ${recipe.ingredients.join(' ')}`
        ).includes(search))
  );
}
