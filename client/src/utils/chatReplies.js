// client/src/utils/chatReplies.js
import { workspaceService } from '../services/workspaceService.js';
import { normalizeSearch } from './recipeFilters.js';

export async function getDatabaseReply(question) {
  const catalog = await workspaceService.getCatalog();
  const words = normalizeSearch(question).split(/\s+/).filter((w) => w.length > 2);
  const matches = catalog.recipes
    .filter((r) => words.some((w) => normalizeSearch(`${r.recipe_name} ${r.ingredients.join(' ')}`).includes(w)))
    .slice(0, 4);
  return {
    title: 'Tra cứu công thức ChayXanh',
    text: matches.length
      ? 'Các công thức phù hợp với tìm kiếm của bạn:'
      : 'Chưa tìm thấy công thức phù hợp. Bạn thử nhập tên món hoặc nguyên liệu cụ thể.',
    items: matches.map((r) => `${r.recipe_name}: ${r.ingredients.join(', ')} — ${r.instructions}`),
    footer: 'Xem thêm các món trong mục Công thức.',
  };
}
