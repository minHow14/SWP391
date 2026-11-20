// d:\Projects\FPT\SWP391\server\src/routes/guestQuotaRoutes.js
// Router quản lý hạn mức hỏi AI của khách (/api/v1/guest-quotas), chỉ dành cho ADMIN.
import { Router } from 'express';
import { getGuestQuota, resetGuestQuota } from '../controllers/guestQuotaController.js';
import { ROLES } from '../constants/roles.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { validateGuestQuotaParams } from '../validators/guestQuotaValidator.js';

const router = Router();
router.use(authenticate, authorize(ROLES.ADMIN));
// GET /guest-quotas/:guestId — [ADMIN] Xem hạn mức còn lại của khách.
router.get('/:guestId', validateGuestQuotaParams, getGuestQuota);
// DELETE /guest-quotas/:guestId — [ADMIN] Đặt lại (xóa) hạn mức đã dùng của khách.
router.delete('/:guestId', validateGuestQuotaParams, resetGuestQuota);
export default router;
