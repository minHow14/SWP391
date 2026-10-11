import { searchService } from '../services/search.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

export const globalSearch = asyncHandler(async (req, res) => {
  const data = await searchService.globalSearch(req.query.q);
  return sendSuccess(res, data);
});
