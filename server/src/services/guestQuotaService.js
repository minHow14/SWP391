// D:/SWP391/SWP391/server/src/services/guestQuotaService.js
import { z } from 'zod';
import { aiConfig } from '../config/aiConfig.js';
import { guestQuotaRepository } from '../repositories/guestQuotaRepository.js';
import { ApiError } from '../utils/apiError.js';
import { getAiQuotaPeriod, MILLISECONDS_PER_DAY } from '../utils/aiQuotaDate.js';
import { guestIdSchema, MAX_GUEST_ID_LENGTH } from '../validators/guestQuotaValidator.js';

const TOO_MANY_REQUESTS = 429;
const quotaDateSchema = z.date().refine((value) => value.getTime() % MILLISECONDS_PER_DAY === 0);

function validateGuestId(guestId) {
  const result = guestIdSchema.safeParse(guestId);
  if (result.success) return result.data;
  throw ApiError.badRequest('Mã khách không hợp lệ', [{
    field: 'guestId', message: `Mã khách phải có từ 1 đến ${MAX_GUEST_ID_LENGTH} ký tự.`,
  }]);
}

function usageData({ guestId, period, used }) {
  return {
    guestId, dailyLimit: aiConfig.guestDailyLimit, used,
    remaining: Math.max(0, aiConfig.guestDailyLimit - used), resetsAt: period.resetsAt,
  };
}

export const guestQuotaService = {
  async getUsage({ guestId, now = new Date() }) {
    const normalizedGuestId = validateGuestId(guestId);
    const period = getAiQuotaPeriod(now);
    const usage = await guestQuotaRepository.findUsage({ guestId: normalizedGuestId, quotaDate: period.quotaDate });
    return usageData({ guestId: normalizedGuestId, period, used: usage?.usedCount ?? 0 });
  },

  async reserveTurn({ guestId, now = new Date() }) {
    const normalizedGuestId = validateGuestId(guestId);
    const period = getAiQuotaPeriod(now);
    const used = await guestQuotaRepository.reserveTurn({
      guestId: normalizedGuestId, quotaDate: period.quotaDate, dailyLimit: aiConfig.guestDailyLimit,
    });
    if (used === null) {
      const error = new ApiError(TOO_MANY_REQUESTS, 'Bạn đã sử dụng hết lượt AI trong ngày.');
      error.errorCode = 'AI_QUOTA_EXCEEDED';
      error.details = [{ field: 'guestId', message: `Hạn mức được đặt lại lúc ${period.resetsAt}.` }];
      error.resetAt = period.resetsAt;
      throw error;
    }
    return { ...usageData({ guestId: normalizedGuestId, period, used }), quotaDate: period.quotaDate };
  },

  async releaseTurn({ guestId, quotaDate }) {
    const normalizedGuestId = validateGuestId(guestId);
    if (!quotaDateSchema.safeParse(quotaDate).success) {
      throw ApiError.badRequest('Ngày giữ lượt AI không hợp lệ');
    }
    // Hoàn vào ngày đã giữ lượt, kể cả khi AI trả lỗi sau nửa đêm giờ Việt Nam.
    await guestQuotaRepository.releaseTurn({ guestId: normalizedGuestId, quotaDate });
  },

  async resetUsage({ guestId, now = new Date() }, db) {
    const normalizedGuestId = validateGuestId(guestId);
    const period = getAiQuotaPeriod(now);
    const usedBefore = await guestQuotaRepository.resetUsage({ guestId: normalizedGuestId, quotaDate: period.quotaDate }, db);
    return { ...usageData({ guestId: normalizedGuestId, period, used: 0 }), usedBefore };
  },
};
