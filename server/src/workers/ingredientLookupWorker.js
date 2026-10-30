// D:/SWP391/SWP391/server/src/workers/ingredientLookupWorker.js
import { setTimeout as delay } from 'node:timers/promises';
import { aiConfig } from '../config/aiConfig.js';
import { logger } from '../config/logger.js';
import { ingredientLookupRepository } from '../repositories/ingredientLookupRepository.js';
import { ingredientLookupService } from '../services/ingredientLookupService.js';
import { processIngredientLookupJob } from '../services/ingredientLookupProcessor.js';
import { INGREDIENT_LOOKUP_POLL_MS, INGREDIENT_LOOKUP_LEASE_GRACE_MS } from '../constants/ingredientLookup.js';

export async function runIngredientLookupWorker(options = {}) {
  const { signal = new AbortController().signal, repository = ingredientLookupRepository,
    service = ingredientLookupService, processJob = processIngredientLookupJob, log = logger } = options;
  while (!signal.aborted) {
    try {
      await service.recoverExpired();
      const job = await repository.claim(aiConfig.timeoutMs + INGREDIENT_LOOKUP_LEASE_GRACE_MS);
      if (job) {
        const result = await processJob(job, { signal });
        log.info({ jobId: job.id, status: result.status }, 'Ingredient lookup job processed');
        continue;
      }
    } catch (error) { log.error({ errorCode: error.errorCode || 'INGREDIENT_LOOKUP_WORKER_ERROR' }, 'Ingredient lookup worker operation failed'); }
    await delay(INGREDIENT_LOOKUP_POLL_MS, undefined, { signal }).catch((error) => { if (!signal.aborted) throw error; });
  }
}
