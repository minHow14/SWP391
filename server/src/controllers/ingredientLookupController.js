// D:/SWP391/SWP391/server/src/controllers/ingredientLookupController.js
// Controller job tra cứu nguyên liệu bằng AI, dùng được cho cả khách và thành viên.
import { ingredientLookupService } from '../services/ingredientLookupService.js';
import { getAiIdentity } from '../middlewares/aiIdentityMiddleware.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { sendSuccess } from '../utils/apiResponse.js';

// Tạo yêu cầu tra cứu; status do service quyết định (vd 202 khi job xử lý nền).
export const createIngredientLookup = asyncHandler(async (req, res) => {
  const result = await ingredientLookupService.create({ payload: req.body, identity: getAiIdentity(req) });
  return sendSuccess(res, { data: result.data }, result.status);
});
// Lấy kết quả tra cứu; identity để chỉ người tạo mới xem được.
export const getIngredientLookup = asyncHandler(async (req, res) => {
  const data = await ingredientLookupService.get({ id: req.params.id, identity: getAiIdentity(req) });
  return sendSuccess(res, { data });
});
