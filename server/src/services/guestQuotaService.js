// D:/SWP391/SWP391/server/src/services/guestQuotaService.js
// Nghiệp vụ hạn mức lượt dùng AI theo ngày cho khách: xem, giữ, hoàn và reset lượt.
import { z } from 'zod';
import { aiConfig } from '../config/aiConfig.js';
import { guestQuotaRepository } from '../repositories/guestQuotaRepository.js';
import { ApiError } from '../utils/apiError.js';
import { getAiQuotaPeriod, MILLISECONDS_PER_DAY } from '../utils/aiQuotaDate.js';
import { guestIdSchema, MAX_GUEST_ID_LENGTH } from '../validators/guestQuotaValidator.js';

const TOO_MANY_REQUESTS = 429;
// Ngày hạn mức phải đúng mốc 00:00 UTC (chia hết cho số ms một ngày) để không giả mạo ngày khác.
const quotaDateSchema = z.date().refine((value) => value.getTime() % MILLISECONDS_PER_DAY === 0);
const reservationRevisionSchema = z.number().int().nonnegative();

// Validate mã khách; sai định dạng thì trả lỗi 400 kèm chi tiết trường.
function validateGuestId(guestId) {
  const result = guestIdSchema.safeParse(guestId);
  if (result.success) return result.data;
  throw ApiError.badRequest('Mã khách không hợp lệ', [{
    field: 'guestId', message: `Mã khách phải có từ 1 đến ${MAX_GUEST_ID_LENGTH} ký tự.`,
  }]);
}

// Dựng dữ liệu hạn mức trả về: giới hạn ngày, đã dùng, còn lại và thời điểm reset.
function usageData({ guestId, period, used }) {
  return {
    guestId, dailyLimit: aiConfig.guestDailyLimit, used,
    remaining: Math.max(0, aiConfig.guestDailyLimit - used), resetsAt: period.resetsAt,
  };
}

export const guestQuotaService = {
  // Xem hạn mức hiện tại của khách.
  async getUsage({ guestId, now = new Date() }) {
    const normalizedGuestId = validateGuestId(guestId);
    const period = getAiQuotaPeriod(now);
    const usage = await guestQuotaRepository.findUsage({ guestId: normalizedGuestId, quotaDate: period.quotaDate });
    return usageData({ guestId: normalizedGuestId, period, used: usage?.usedCount ?? 0 });
  },

  // Giữ một lượt trước khi gọi AI; hết lượt thì trả 429 kèm thời điểm reset.
  async reserveTurn({ guestId, now = new Date() }, db) {
    const normalizedGuestId = validateGuestId(guestId);
    const period = getAiQuotaPeriod(now);
    const reservation = await guestQuotaRepository.reserveTurn({
      guestId: normalizedGuestId, quotaDate: period.quotaDate, dailyLimit: aiConfig.guestDailyLimit,
    }, db);
    if (reservation === null) {
      const error = new ApiError(TOO_MANY_REQUESTS, 'Bạn đã sử dụng hết lượt AI trong ngày.');
      error.errorCode = 'AI_QUOTA_EXCEEDED';
      error.details = [{ field: 'guestId', message: `Hạn mức được đặt lại lúc ${period.resetsAt}.` }];
      error.resetAt = period.resetsAt;
      throw error;
    }
    return {
      ...usageData({ guestId: normalizedGuestId, period, used: reservation.usedCount }),
      quotaDate: period.quotaDate, reservationRevision: reservation.reservationRevision,
    };
  },

  // Hoàn lượt khi lần gọi AI thất bại để khách không bị trừ oan.
  async releaseTurn({ guestId, quotaDate, reservationRevision }) {
    const normalizedGuestId = validateGuestId(guestId);
    if (!quotaDateSchema.safeParse(quotaDate).success || !reservationRevisionSchema.safeParse(reservationRevision).success) {
      throw ApiError.badRequest('Thông tin giữ lượt AI không hợp lệ');
    }
    // Giữ đúng ngày và phiên bản; reset của admin không được làm lỗi cũ hoàn nhầm lượt mới.
    await guestQuotaRepository.releaseTurn({ guestId: normalizedGuestId, quotaDate, reservationRevision });
  },

  // Reset lượt dùng trong ngày (admin); trả về cả số lượt trước khi reset để ghi log.
  async resetUsage({ guestId, now = new Date() }, db) {
    const normalizedGuestId = validateGuestId(guestId);
    const period = getAiQuotaPeriod(now);
    const usedBefore = await guestQuotaRepository.resetUsage({ guestId: normalizedGuestId, quotaDate: period.quotaDate }, db);
    return { ...usageData({ guestId: normalizedGuestId, period, used: 0 }), usedBefore };
  },
};
