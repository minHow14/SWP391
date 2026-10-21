// d:\Projects\FPT\SWP391\server\src\controllers\search.controller.js
import { searchService } from '../services/search.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

export const globalSearch = asyncHandler(async (req, res) => {
  const data = await searchService.globalSearch(req.query.q);
  return sendSuccess(res, data);
});

export const suggestByKeyword = asyncHandler(async (req, res) => {
  const data = await searchService.suggestByKeyword(req.query.keyword);
  return sendSuccess(res, data);
});

// Alias tương thích ngược
export const recommendationController = {
  suggestByKeyword,
};
