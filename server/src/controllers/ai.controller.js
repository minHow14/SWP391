// d:\Projects\FPT\SWP391\server\src\controllers\ai.controller.js
import { aiService } from '../services/ai.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

/**
 * Lấy hạn mức sử dụng AI trong ngày của người dùng hoặc khách
 */
export const getUsage = asyncHandler(async (req, res) => {
  const guestId = req.headers['x-guest-id'];
  const usage = await aiService.getUsage({
    user: req.user || null,
    guestId,
    ip: req.ip,
  });

  return sendSuccess(res, { data: usage });
});

/**
 * Luồng Server-Sent Events hỏi đáp với Chatbot Dinh dưỡng
 */
export const streamChat = asyncHandler(async (req, res) => {
  const guestId = req.headers['x-guest-id'];
  await aiService.streamChat(
    req.body,
    {
      user: req.user || null,
      guestId,
      ip: req.ip,
    },
    res
  );
});

/**
 * Luồng Server-Sent Events sinh thực đơn ăn chay cá nhân hóa
 */
export const streamMealPlan = asyncHandler(async (req, res) => {
  const guestId = req.headers['x-guest-id'];
  await aiService.streamMealPlan(
    req.body,
    {
      user: req.user || null,
      guestId,
      ip: req.ip,
    },
    res
  );
});
