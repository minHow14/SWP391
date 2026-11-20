// D:/SWP391/SWP391/server/tests/aiDietaryContract.test.js
// Kiểm thử hợp đồng chế độ ăn (dietaryType) giữa gateway BE và AI Service cho chat và thực đơn.
import { describe, expect, it } from 'vitest';
import { aiChatSchema, aiMealPlanSchema } from '../src/validators/aiRequestValidator.js';

// Nhóm test: các chế độ ăn hợp lệ phải đi qua validator nguyên vẹn, giá trị lạ bị chặn.
describe('AI dietary contract', () => {
  // Mỗi chế độ ăn được hỗ trợ phải giữ nguyên giá trị khi qua schema chat và meal plan,
  // tránh AI nhận sai chế độ ăn so với người dùng chọn.
  it.each(['vegan', 'lacto', 'ovo', 'lacto_ovo', 'buddhist', 'keto', 'eat_clean'])('preserves %s for chat and meals', (dietaryType) => {
    expect(aiChatSchema.parse({ message: 'Gợi ý món ăn', dietaryType }).dietaryType).toBe(dietaryType);
    expect(aiMealPlanSchema.parse({ heightCm: 165, weightKg: 60, dietaryType }).dietaryType).toBe(dietaryType);
  });
  // Chế độ ăn không hỗ trợ phải bị từ chối ở cả hai cổng vào, không để dữ liệu lạ lọt sang AI Service.
  it('rejects unsupported diets at both gateway boundaries', () => {
    expect(aiChatSchema.safeParse({ message: 'Gợi ý món ăn', dietaryType: 'arbitrary' }).success).toBe(false);
    expect(aiMealPlanSchema.safeParse({ heightCm: 165, weightKg: 60, dietaryType: 'arbitrary' }).success).toBe(false);
  });
});
