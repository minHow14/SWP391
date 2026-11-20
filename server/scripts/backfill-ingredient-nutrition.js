// D:/SWP391/SWP391/server/scripts/backfill-ingredient-nutrition.js
// Script CLI bổ sung giá trị dinh dưỡng cho các nguyên liệu còn thiếu (qua ingredientNutritionBackfill).
// Dùng cờ --dry-run để chỉ xem trước, không ghi vào DB.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from '../src/config/prisma.js';
import { backfillIngredientNutrition } from '../src/services/ingredientNutritionBackfill.js';

const DRY_RUN_FLAG = '--dry-run';

// Định dạng một dòng báo cáo cho từng nguyên liệu: kèm dinh dưỡng nếu thành công, kèm mã lỗi nếu thất bại.
function describe({ name, status, nutrition, errorCode }) {
  if (nutrition) {
    const { calories, protein, fat, carbs } = nutrition;
    return `${status} ${name}: ${calories} kcal, đạm ${protein} g, béo ${fat} g, carb ${carbs} g / 100 g`;
  }
  return `${status} ${name}${errorCode ? ` (${errorCode})` : ''}`;
}

// Chỉ chạy khi file được gọi trực tiếp bằng node (không chạy khi bị import trong test).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dryRun = process.argv.includes(DRY_RUN_FLAG);
  try {
    const report = await backfillIngredientNutrition({ dryRun });
    report.forEach((entry) => console.log(describe(entry)));
    console.log(`${dryRun ? 'Xem trước' : 'Đã xử lý'} ${report.length} nguyên liệu thiếu dinh dưỡng.`);
    // Đặt mã thoát khác 0 nếu có nguyên liệu thất bại để người chạy/CI nhận biết.
    if (report.some((entry) => entry.status === 'FAILED')) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
