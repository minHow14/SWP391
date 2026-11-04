// D:/SWP391/SWP391/server/tests/aiDietaryContract.test.js
import { describe, expect, it } from 'vitest';
import { aiChatSchema, aiMealPlanSchema } from '../src/validators/aiRequestValidator.js';

describe('AI dietary contract', () => {
  it.each(['vegan', 'lacto', 'ovo', 'lacto_ovo', 'buddhist', 'keto', 'eat_clean'])('preserves %s for chat and meals', (dietaryType) => {
    expect(aiChatSchema.parse({ message: 'Gợi ý món ăn', dietaryType }).dietaryType).toBe(dietaryType);
    expect(aiMealPlanSchema.parse({ heightCm: 165, weightKg: 60, dietaryType }).dietaryType).toBe(dietaryType);
  });
  it('rejects unsupported diets at both gateway boundaries', () => {
    expect(aiChatSchema.safeParse({ message: 'Gợi ý món ăn', dietaryType: 'arbitrary' }).success).toBe(false);
    expect(aiMealPlanSchema.safeParse({ heightCm: 165, weightKg: 60, dietaryType: 'arbitrary' }).success).toBe(false);
  });
});
