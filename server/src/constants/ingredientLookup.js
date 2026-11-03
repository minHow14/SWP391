// D:/SWP391/SWP391/server/src/constants/ingredientLookup.js
export const INGREDIENT_LOOKUP_AI_PATH = '/api/ingredient-lookups';
export const INGREDIENT_LOOKUP_POLL_MS = 1_000;
export const INGREDIENT_LOOKUP_LEASE_GRACE_MS = 30_000;
export const INGREDIENT_LOOKUP_RECOVERY_BATCH = 20;
export const INGREDIENT_LOOKUP_FAILURE_MESSAGE = 'Chưa thể tạo thông tin nguyên liệu. Vui lòng thử lại.';
export const INGREDIENT_LOOKUP_RELEASED = Object.freeze({ activeKey: null, leaseToken: null,
  leaseExpiresAt: null, sourcePhoto: null, sourceMimeType: null });
