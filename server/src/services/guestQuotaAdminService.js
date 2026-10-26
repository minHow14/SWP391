// d:\Projects\FPT\SWP391\server\src/services/guestQuotaAdminService.js
import { AI_LOG_STATUS } from '../constants/aiLogs.js';
import { guestQuotaRepository } from '../repositories/guestQuotaRepository.js';
import { guestQuotaAdminSchema, parseGuestQuotaInput } from '../validators/guestQuotaValidator.js';
import { aiLogService } from './aiLogService.js';
import { guestQuotaService } from './guestQuotaService.js';

const ADMIN_MODEL_NAME = 'admin';
const QUOTA_RESET_ACTION_PREFIX = 'ADMIN_RESET_GUEST_QUOTA_BY_';

export const guestQuotaAdminService = {
  resetUsage(input) {
    const { guestId, adminUserId } = parseGuestQuotaInput(guestQuotaAdminSchema, input);
    return guestQuotaRepository.runTransaction(async (tx) => {
      const result = await guestQuotaService.resetUsage({ guestId }, tx);
      await aiLogService.recordLog({
        modelName: ADMIN_MODEL_NAME,
        action: `${QUOTA_RESET_ACTION_PREFIX}${adminUserId}`,
        status: AI_LOG_STATUS.SUCCESS,
        errorFeedback: `Khách: ${result.guestId}; số lượt trước khi reset: ${result.usedBefore}.`,
      }, tx);
      return result;
    });
  },
};
