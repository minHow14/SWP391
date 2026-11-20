// d:\Projects\FPT\SWP391\server\src/services/guestQuotaAdminService.js
// Nghiệp vụ admin đặt lại hạn mức dùng AI của khách (guest) và ghi nhật ký kiểm toán.
import { AI_LOG_STATUS } from '../constants/aiLogs.js';
import { guestQuotaRepository } from '../repositories/guestQuotaRepository.js';
import { guestQuotaAdminSchema, parseGuestQuotaInput } from '../validators/guestQuotaValidator.js';
import { aiLogService } from './aiLogService.js';
import { guestQuotaService } from './guestQuotaService.js';

// Ghi log với modelName 'admin' để phân biệt thao tác quản trị với các lượt gọi AI thật.
const ADMIN_MODEL_NAME = 'admin';
// Gắn ID admin vào action để truy vết ai đã reset hạn mức.
const QUOTA_RESET_ACTION_PREFIX = 'ADMIN_RESET_GUEST_QUOTA_BY_';

export const guestQuotaAdminService = {
  // Reset số lượt AI đã dùng của khách; reset và ghi log cùng một transaction để không mất dấu kiểm toán.
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
