// D:/SWP391/SWP391/server/src/controllers/legalDocumentController.js
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { legalDocumentService } from '../services/legalDocumentService.js';

export const getPublishedLegalDocument = asyncHandler(async (req, res) => {
  return sendSuccess(res, await legalDocumentService.get(req.params.slug));
});
export const getAdminLegalDocument = asyncHandler(async (req, res) => {
  return sendSuccess(res, await legalDocumentService.get(req.params.slug, { includeDraft: true }));
});
export const saveLegalDocument = asyncHandler(async (req, res) => {
  return sendSuccess(res, await legalDocumentService.save({ slug: req.params.slug, ...req.body }));
});
