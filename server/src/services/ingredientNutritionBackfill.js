// D:/SWP391/SWP391/server/src/services/ingredientNutritionBackfill.js
import { randomUUID } from 'node:crypto';
import { ingredientLookupRepository } from '../repositories/ingredientLookupRepository.js';
import { generateIngredientInformation } from './ingredientLookupAiService.js';

async function backfillOne({ ingredient, dryRun, generate, repository }) {
  const entry = { ingredientId: ingredient.ingredient_id, name: ingredient.name };
  try {
    const { nutritionPer100g } = await generate({ job: { id: randomUUID(), ingredientName: ingredient.name } });
    if (!nutritionPer100g) return { ...entry, status: 'NO_ESTIMATE' };
    if (dryRun) return { ...entry, status: 'PREVIEW', nutrition: nutritionPer100g };
    const updated = await repository.fillMissingNutrition({ ingredient, nutrition: nutritionPer100g });
    return { ...entry, status: updated ? 'UPDATED' : 'UNCHANGED', nutrition: nutritionPer100g };
  } catch (error) {
    return { ...entry, status: 'FAILED', errorCode: error.errorCode || 'INGREDIENT_NUTRITION_BACKFILL_FAILED' };
  }
}

/**
 * Fills empty per-100 g nutrition for dictionary entries created before AI lookups produced it.
 * Only empty columns are written; descriptions, photos and existing figures stay untouched.
 */
export async function backfillIngredientNutrition({ dryRun = false, generate = generateIngredientInformation,
  repository = ingredientLookupRepository } = {}) {
  const report = [];
  // Sequential on purpose: a handful of entries does not justify bursting the AI provider.
  for (const ingredient of await repository.findMissingNutrition()) {
    report.push(await backfillOne({ ingredient, dryRun, generate, repository }));
  }
  return report;
}
