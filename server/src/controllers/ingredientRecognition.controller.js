// d:/Projects/FPT/SWP391/server/src/controllers/ingredientRecognition.controller.js
import { ingredientRecognitionService } from '../services/ingredientRecognition.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { getAiIdentity } from '../middlewares/aiIdentityMiddleware.js';

export const recognize = asyncHandler(async (req, res) => {
  const result = await ingredientRecognitionService.recognize({
    file: req.file,
    options: req.body,
    identity: getAiIdentity(req),
    requestId: req.id,
  });

  return sendSuccess(res, {
    message: 'Nhận diện nguyên liệu và đánh giá độ tươi thành công.',
    data: result,
    meta: {
      totalRecognized: result.recognizedItems.length,
      totalMatchingRecipes: result.matchingRecipes.length,
      expiringSoonCount: result.recognizedItems.filter((i) => i.freshnessStatus === 'EXPIRING_SOON').length,
    },
  });
});

export const getScanHistory = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const history = await ingredientRecognitionService.getScanHistory(userId, req.query);

  return sendSuccess(res, {
    message: 'Lấy lịch sử nhận diện thành công.',
    data: history.items,
    meta: history.meta,
  });
});

export const getScanById = asyncHandler(async (req, res) => {
  const userId = req.user?.user_id ?? null;
  const data = await ingredientRecognitionService.getScanDetail(req.params.id, userId);

  return sendSuccess(res, {
    message: 'Lấy chi tiết phiên quét thành công.',
    data,
  });
});

export const deleteScan = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  await ingredientRecognitionService.deleteScan(req.params.id, userId);

  return sendSuccess(res, {
    message: 'Đã xóa bản ghi quét nguyên liệu thành công.',
  });
});
