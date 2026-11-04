// D:/SWP391/SWP391/server/src/routes/legalDocumentRoutes.js
import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { ROLES } from '../constants/roles.js';
import { legalDocumentParams, legalDocumentBody } from '../validators/legalDocumentValidator.js';
import { getPublishedLegalDocument, getAdminLegalDocument, saveLegalDocument } from '../controllers/legalDocumentController.js';

const router = Router();
router.get('/legal-documents/:slug', validate(legalDocumentParams, 'params'), getPublishedLegalDocument);
router.get('/admin/legal-documents/:slug', authenticate, authorize(ROLES.ADMIN), validate(legalDocumentParams, 'params'), getAdminLegalDocument);
router.put('/admin/legal-documents/:slug', authenticate, authorize(ROLES.ADMIN), validate(legalDocumentParams, 'params'), validate(legalDocumentBody), saveLegalDocument);
export default router;
