import { recommendationService } from '../services/recommendation.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

export const suggestByKeyword = asyncHandler(async (req, res) => {
  const data = await recommendationService.suggestByKeyword(req.query.keyword);
  return sendSuccess(res, data);
});
