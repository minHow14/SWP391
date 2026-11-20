// D:/SWP391/SWP391/server/src/constants/ingredientLookup.js
// Hằng số cho luồng tra cứu nguyên liệu bằng AI: endpoint, thông số worker và ngưỡng kiểm tra dinh dưỡng hợp lệ.
export const INGREDIENT_LOOKUP_AI_PATH = '/api/ingredient-lookups';
// Chu kỳ poll, thời gian lease dư và số job tối đa được thu hồi mỗi lượt.
export const INGREDIENT_LOOKUP_POLL_MS = 1_000;
export const INGREDIENT_LOOKUP_LEASE_GRACE_MS = 30_000;
export const INGREDIENT_LOOKUP_RECOVERY_BATCH = 20;
// Chất béo nguyên chất khoảng 900 kcal mỗi 100 g, là mật độ năng lượng cao nhất một nguyên liệu thực phẩm có thể đạt.
export const NUTRITION_MAX_CALORIES_PER_100G = 900;
export const NUTRITION_MAX_GRAMS_PER_100G = 100;
// Hệ số Atwater (kcal mỗi gram); chất xơ và việc làm tròn khiến nhãn thực tế lệch đi, nên ngưỡng sai số được nới rộng.
export const NUTRITION_ATWATER = Object.freeze({ protein: 4, carbs: 4, fat: 9 });
export const NUTRITION_ENERGY_TOLERANCE = Object.freeze({ ratio: 0.35, kcal: 25 });
export const INGREDIENT_LOOKUP_FAILURE_MESSAGE = 'Chưa thể tạo thông tin nguyên liệu. Vui lòng thử lại.';
// Giá trị dùng để giải phóng khoá hoạt động, lease và ảnh nguồn khi job kết thúc (không giữ ảnh người dùng lâu hơn cần thiết).
export const INGREDIENT_LOOKUP_RELEASED = Object.freeze({ activeKey: null, leaseToken: null,
  leaseExpiresAt: null, sourcePhoto: null, sourceMimeType: null });
