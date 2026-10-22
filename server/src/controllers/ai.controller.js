// D:/SWP391/SWP391/server/src/controllers/ai.controller.js
import { aiService } from '../services/ai.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { getAiIdentity } from '../middlewares/aiIdentityMiddleware.js';

/**
 * Lấy hạn mức sử dụng AI trong ngày của người dùng hoặc khách
 */
export const getUsage = asyncHandler(async (req, res) => {
  const usage = await aiService.getUsage(getAiIdentity(req));

  return sendSuccess(res, { data: usage });
});

/**
 * Luồng Server-Sent Events hỏi đáp với Chatbot Dinh dưỡng
 */
export const streamChat = asyncHandler(async (req, res) => {
  await aiService.streamChat({ payload: req.body, identity: getAiIdentity(req), res, requestId: req.id });
});

/**
 * Luồng Server-Sent Events sinh thực đơn ăn chay cá nhân hóa
 */
export const streamMealPlan = asyncHandler(async (req, res) => {
  await aiService.streamMealPlan({ payload: req.body, identity: getAiIdentity(req), res, requestId: req.id });
});
