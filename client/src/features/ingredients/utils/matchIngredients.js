// D:/SWP391/SWP391/client/src/features/ingredients/utils/matchIngredients.js
import { normalizeSearch } from '../../../utils/recipeFilters.js';

const MIN_TERM_LENGTH = 3;
const SCORE = Object.freeze({ EXACT: 3, NAME: 2, ALIAS: 1 });
const PARENTHESES = /\([^)]*\)/g;
const QUANTITY = /\d+([.,]\d+)?\s*(g|kg|ml|l|quả|trái|củ)?\b/g;

// AI hay kèm khối lượng hoặc ghi chú trong ngoặc, ví dụ "Đậu hũ non (150g)".
const cleanTerm = (value) =>
  normalizeSearch(String(value).replace(PARENTHESES, ' ').replace(QUANTITY, ' '))
    .replace(/\s+/g, ' ')
    .trim();

function scoreIngredient(term, ingredient) {
  const name = normalizeSearch(ingredient.name);
  if (term === name) return { score: SCORE.EXACT, length: name.length };
  if (name.length >= MIN_TERM_LENGTH && term.includes(name)) return { score: SCORE.NAME, length: name.length };
  if (term.length >= MIN_TERM_LENGTH && name.includes(term)) return { score: SCORE.NAME, length: term.length };
  if (term.length >= MIN_TERM_LENGTH && normalizeSearch(ingredient.aliases || '').includes(term)) {
    return { score: SCORE.ALIAS, length: term.length };
  }
  return null;
}

function bestIngredient(term, ingredients) {
  let best = null;
  for (const ingredient of ingredients) {
    const found = scoreIngredient(term, ingredient);
    const better = found && (!best || found.score > best.score || (found.score === best.score && found.length > best.length));
    if (better) best = { ...found, ingredient };
  }
  return best?.ingredient ?? null;
}

/** Ghép các tên AI nhận diện được với nguyên liệu trong từ điển, giữ thứ tự và bỏ trùng. */
export function matchIngredients(candidates, ingredients) {
  const matches = new Map();
  for (const candidate of candidates) {
    const term = cleanTerm(candidate);
    if (term.length < MIN_TERM_LENGTH) continue;
    const found = bestIngredient(term, ingredients);
    if (found) matches.set(found.id, found);
  }
  return [...matches.values()];
}
