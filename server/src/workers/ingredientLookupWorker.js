// D:/SWP391/SWP391/server/src/workers/ingredientLookupWorker.js
// Worker nền tra cứu thông tin nguyên liệu bằng AI, chạy cùng tiến trình server.
import { setTimeout as delay } from 'node:timers/promises';
import { aiConfig } from '../config/aiConfig.js';
import { logger } from '../config/logger.js';
import { ingredientLookupRepository } from '../repositories/ingredientLookupRepository.js';
import { ingredientLookupService } from '../services/ingredientLookupService.js';
import { processIngredientLookupJob } from '../services/ingredientLookupProcessor.js';
import { INGREDIENT_LOOKUP_POLL_MS, INGREDIENT_LOOKUP_LEASE_GRACE_MS } from '../constants/ingredientLookup.js';

// Vòng lặp worker; các phụ thuộc được truyền qua options để test có thể thay thế.
export async function runIngredientLookupWorker(options = {}) {
  const { signal = new AbortController().signal, repository = ingredientLookupRepository,
    service = ingredientLookupService, processJob = processIngredientLookupJob, log = logger } = options;
  while (!signal.aborted) {
    try {
      await service.recoverExpired();
      // Lease dài hơn timeout gọi AI một khoảng dự phòng để job không bị nhận trùng khi AI đang xử lý.
      const job = await repository.claim(aiConfig.timeoutMs + INGREDIENT_LOOKUP_LEASE_GRACE_MS);
      if (job) {
        const result = await processJob(job, { signal });
        log.info({ jobId: job.id, status: result.status }, 'Ingredient lookup job processed');
        continue;
      }
    } catch (error) { log.error({ errorCode: error.errorCode || 'INGREDIENT_LOOKUP_WORKER_ERROR' }, 'Ingredient lookup worker operation failed'); }
    // Chỉ nuốt lỗi khi bị huỷ do dừng worker; lỗi khác được ném ra.
    await delay(INGREDIENT_LOOKUP_POLL_MS, undefined, { signal }).catch((error) => { if (!signal.aborted) throw error; });
  }
}
