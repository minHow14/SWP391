// D:/SWP391/SWP391/server/src/controllers/ingredientLookupController.js
import { ingredientLookupService } from '../services/ingredientLookupService.js';
import { getAiIdentity } from '../middlewares/aiIdentityMiddleware.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const createIngredientLookup = asyncHandler(async (req, res) => {
  const result = await ingredientLookupService.create({ payload: req.body, identity: getAiIdentity(req) });
  return sendSuccess(res, { data: result.data }, result.status);
});
export const getIngredientLookup = asyncHandler(async (req, res) => {
  const data = await ingredientLookupService.get({ id: req.params.id, identity: getAiIdentity(req) });
  return sendSuccess(res, { data });
});
