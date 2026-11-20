// d:\Projects\FPT\SWP391\server\src/controllers/aiGenerationController.js
// Controller lịch sử kết quả AI đã sinh của người dùng (chỉ đọc dữ liệu của chính mình).
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { aiGenerationService } from '../services/aiGenerationService.js';

// Danh sách kết quả AI của người dùng; query đã validate nằm ở res.locals.aiGenerationQuery.
export const listAiGenerations = asyncHandler(async (req, res) => {
  const result = await aiGenerationService.listOwned(res.locals.aiGenerationQuery);
  res.json({ success: true, message: 'Lấy lịch sử AI thành công.', ...result, meta: { ...result.meta, requestId: req.id } });
});
// Chi tiết một kết quả AI, service đảm bảo chỉ chủ sở hữu mới đọc được.
export const getAiGeneration = asyncHandler(async (req, res) => {
  const data = await aiGenerationService.getOwned(res.locals.aiGenerationQuery);
  res.json({ success: true, message: 'Lấy kết quả AI thành công.', data, meta: { requestId: req.id } });
});
