// D:/SWP391/SWP391/server/src/constants/ingredientLookup.js
export const INGREDIENT_LOOKUP_AI_PATH = '/api/ingredient-lookups';
export const INGREDIENT_LOOKUP_POLL_MS = 1_000;
export const INGREDIENT_LOOKUP_LEASE_GRACE_MS = 30_000;
export const INGREDIENT_LOOKUP_RECOVERY_BATCH = 20;
// Pure fat is about 900 kcal per 100 g, the highest density a food ingredient can reach.
export const NUTRITION_MAX_CALORIES_PER_100G = 900;
export const NUTRITION_MAX_GRAMS_PER_100G = 100;
// Atwater factors (kcal per gram); fibre and rounding make real labels drift, so the tolerance is generous.
export const NUTRITION_ATWATER = Object.freeze({ protein: 4, carbs: 4, fat: 9 });
export const NUTRITION_ENERGY_TOLERANCE = Object.freeze({ ratio: 0.35, kcal: 25 });
export const INGREDIENT_LOOKUP_FAILURE_MESSAGE = 'Chưa thể tạo thông tin nguyên liệu. Vui lòng thử lại.';
export const INGREDIENT_LOOKUP_RELEASED = Object.freeze({ activeKey: null, leaseToken: null,
  leaseExpiresAt: null, sourcePhoto: null, sourceMimeType: null });
