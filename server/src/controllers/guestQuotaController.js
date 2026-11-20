// d:\Projects\FPT\SWP391\server\src/controllers/guestQuotaController.js
// Controller quản lý hạn mức hỏi AI của khách (ADMIN).
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { guestQuotaAdminService } from '../services/guestQuotaAdminService.js';
import { guestQuotaService } from '../services/guestQuotaService.js';

// Xem lượt đã dùng/còn lại của khách.
export const getGuestQuota = asyncHandler(async (req, res) => {
  const data = await guestQuotaService.getUsage(res.locals.guestQuotaParams);
  return res.json({
    success: true, message: 'Lấy hạn mức AI thành công.', data, meta: { requestId: req.id },
  });
});

// Đặt lại hạn mức khách, lưu adminUserId để phục vụ kiểm toán.
export const resetGuestQuota = asyncHandler(async (req, res) => {
  const data = await guestQuotaAdminService.resetUsage({
    ...res.locals.guestQuotaParams, adminUserId: req.user.user_id,
  });
  return res.json({
    success: true, message: 'Đặt lại hạn mức AI thành công.', data, meta: { requestId: req.id },
  });
});
