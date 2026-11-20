// client/src/utils/recipeFilters.js
// Lọc và tìm kiếm công thức theo từ khóa, danh mục và chế độ ăn.
// Chuẩn hóa chuỗi tìm kiếm: chữ thường, bỏ dấu tiếng Việt.
export function normalizeSearch(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

// Lọc công thức theo danh mục, độ phù hợp với chế độ ăn (khi matchDiet bật) và từ khóa trong tên/nguyên liệu.
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
