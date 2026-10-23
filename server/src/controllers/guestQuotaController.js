// D:/SWP391/SWP391/server/src/controllers/guestQuotaController.js
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { guestQuotaAdminService } from '../services/guestQuotaAdminService.js';
import { guestQuotaService } from '../services/guestQuotaService.js';

export const getGuestQuota = asyncHandler(async (req, res) => {
  const data = await guestQuotaService.getUsage(res.locals.guestQuotaParams);
  return res.json({
    success: true, message: 'Lấy hạn mức AI thành công.', data, meta: { requestId: req.id },
  });
});

export const resetGuestQuota = asyncHandler(async (req, res) => {
  const data = await guestQuotaAdminService.resetUsage({
    ...res.locals.guestQuotaParams, adminUserId: req.user.user_id,
  });
  return res.json({
    success: true, message: 'Đặt lại hạn mức AI thành công.', data, meta: { requestId: req.id },
  });
});
