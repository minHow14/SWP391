// D:/SWP391/SWP391/server/src/services/ingredientNutritionBackfill.js
// Công cụ bổ sung dữ liệu dinh dưỡng còn thiếu cho từ điển nguyên liệu bằng AI.
import { randomUUID } from 'node:crypto';
import { ingredientLookupRepository } from '../repositories/ingredientLookupRepository.js';
import { generateIngredientInformation } from './ingredientLookupAiService.js';

// Bổ sung dinh dưỡng cho một nguyên liệu; luôn trả về một dòng báo cáo thay vì ném lỗi để vòng lặp không dừng giữa chừng.
async function backfillOne({ ingredient, dryRun, generate, repository }) {
  const entry = { ingredientId: ingredient.ingredient_id, name: ingredient.name };
  try {
    // Tạo job tạm với id ngẫu nhiên vì AI Service cần requestId để truy vết.
    const { nutritionPer100g } = await generate({ job: { id: randomUUID(), ingredientName: ingredient.name } });
    if (!nutritionPer100g) return { ...entry, status: 'NO_ESTIMATE' };
    // Chế độ dryRun chỉ xem trước, không ghi DB.
    if (dryRun) return { ...entry, status: 'PREVIEW', nutrition: nutritionPer100g };
    const updated = await repository.fillMissingNutrition({ ingredient, nutrition: nutritionPer100g });
    return { ...entry, status: updated ? 'UPDATED' : 'UNCHANGED', nutrition: nutritionPer100g };
  } catch (error) {
    return { ...entry, status: 'FAILED', errorCode: error.errorCode || 'INGREDIENT_NUTRITION_BACKFILL_FAILED' };
  }
}

/**
  * Điền dinh dưỡng trên 100 g còn trống cho các nguyên liệu được tạo trước khi tra cứu AI có trả về dinh dưỡng.
  * Chỉ ghi vào cột đang trống; mô tả, ảnh và số liệu đã có được giữ nguyên.
 */
export async function backfillIngredientNutrition({ dryRun = false, generate = generateIngredientInformation,
  repository = ingredientLookupRepository } = {}) {
  const report = [];
  // Cố ý chạy tuần tự: số lượng nguyên liệu ít, không đáng để bắn dồn request vào nhà cung cấp AI.
  for (const ingredient of await repository.findMissingNutrition()) {
    report.push(await backfillOne({ ingredient, dryRun, generate, repository }));
  }
  return report;
}
