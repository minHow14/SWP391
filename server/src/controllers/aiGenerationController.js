// D:/SWP391/SWP391/server/src/controllers/aiGenerationController.js
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { aiGenerationService } from '../services/aiGenerationService.js';

export const listAiGenerations = asyncHandler(async (req, res) => {
  const result = await aiGenerationService.listOwned(res.locals.aiGenerationQuery);
  res.json({ success: true, message: 'Lấy lịch sử AI thành công.', ...result, meta: { ...result.meta, requestId: req.id } });
});
export const getAiGeneration = asyncHandler(async (req, res) => {
  const data = await aiGenerationService.getOwned(res.locals.aiGenerationQuery);
  res.json({ success: true, message: 'Lấy kết quả AI thành công.', data, meta: { requestId: req.id } });
});
