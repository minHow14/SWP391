// D:/SWP391/SWP391/server/src/routes/guestQuotaRoutes.js
import { Router } from 'express';
import { getGuestQuota, resetGuestQuota } from '../controllers/guestQuotaController.js';
import { ROLES } from '../constants/roles.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { validateGuestQuotaParams } from '../validators/guestQuotaValidator.js';

const router = Router();
router.use(authenticate, authorize(ROLES.ADMIN));
router.get('/:guestId', validateGuestQuotaParams, getGuestQuota);
router.delete('/:guestId', validateGuestQuotaParams, resetGuestQuota);
export default router;
