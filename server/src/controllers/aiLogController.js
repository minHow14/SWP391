// D:/SWP391/SWP391/server/src/controllers/aiLogController.js
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { aiLogService } from '../services/aiLogService.js';

export const listAiLogs = asyncHandler(async (req, res) => {
  const result = await aiLogService.listLogs(res.locals.aiLogQuery);
  const { page, limit, total, totalPages } = result;
  return res.json({
    success: true, message: 'Lấy nhật ký AI thành công.', data: result.items,
    meta: { page, limit, total, totalPages, requestId: req.id },
  });
});

export const getAiLogStats = asyncHandler(async (req, res) => {
  const data = await aiLogService.getStats(res.locals.aiLogQuery);
  return res.json({
    success: true, message: 'Lấy thống kê AI thành công.', data, meta: { requestId: req.id },
  });
});
