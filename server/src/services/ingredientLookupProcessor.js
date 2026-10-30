// D:/SWP391/SWP391/server/src/services/ingredientLookupProcessor.js
import { generateIngredientInformation } from './ingredientLookupAiService.js';
import { ingredientLookupService } from './ingredientLookupService.js';

export async function processIngredientLookupJob(job, { signal } = {}) {
  try {
    const result = await generateIngredientInformation({ job, signal });
    signal?.throwIfAborted();
    return await ingredientLookupService.complete({ job, result });
  } catch (error) {
    if (error.errorCode === 'INGREDIENT_LOOKUP_LEASE_LOST') throw error;
    return ingredientLookupService.fail({ job, errorCode: error.errorCode || 'INGREDIENT_LOOKUP_FAILED' });
  }
}
