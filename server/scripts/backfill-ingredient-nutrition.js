// D:/SWP391/SWP391/server/scripts/backfill-ingredient-nutrition.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from '../src/config/prisma.js';
import { backfillIngredientNutrition } from '../src/services/ingredientNutritionBackfill.js';

const DRY_RUN_FLAG = '--dry-run';

function describe({ name, status, nutrition, errorCode }) {
  if (nutrition) {
    const { calories, protein, fat, carbs } = nutrition;
    return `${status} ${name}: ${calories} kcal, đạm ${protein} g, béo ${fat} g, carb ${carbs} g / 100 g`;
  }
  return `${status} ${name}${errorCode ? ` (${errorCode})` : ''}`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dryRun = process.argv.includes(DRY_RUN_FLAG);
  try {
    const report = await backfillIngredientNutrition({ dryRun });
    report.forEach((entry) => console.log(describe(entry)));
    console.log(`${dryRun ? 'Xem trước' : 'Đã xử lý'} ${report.length} nguyên liệu thiếu dinh dưỡng.`);
    if (report.some((entry) => entry.status === 'FAILED')) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
