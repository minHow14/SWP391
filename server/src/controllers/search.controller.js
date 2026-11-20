// d:\Projects\FPT\SWP391\server\src\controllers\search.controller.js
// Controller tìm kiếm toàn cục và gợi ý theo từ khóa.
import { searchService } from '../services/search.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { aiLogService } from '../services/aiLogService.js';
import { AI_LOG_STATUS } from '../constants/aiLogs.js';

// Tìm kiếm video/blog; nhận cả categoryId lẫn category_id (client cũ), mặc định trang 1, 20 kết quả.
export const globalSearch = asyncHandler(async (req, res) => {
  const { q, type, page, limit, categoryId, category_id } = req.query;
  const resolvedCategoryId = categoryId || category_id;
  const data = await searchService.globalSearch(q, {
    type,
    page: page !== undefined ? Number(page) : 1,
    limit: limit !== undefined ? Number(limit) : 20,
    categoryId: resolvedCategoryId !== undefined ? Number(resolvedCategoryId) : undefined,
  });
  return sendSuccess(res, data);
});

// Gợi ý nội dung theo từ khóa và ghi nhật ký AI; lỗi ghi log bị bỏ qua để không ảnh hưởng người dùng.
export const suggestByKeyword = asyncHandler(async (req, res) => {
  const data = await searchService.suggestByKeyword(req.query.keyword);
  await aiLogService.recordLog({
    modelName: 'Internal / DeepSeek',
    action: 'RECOMMENDATION',
    status: AI_LOG_STATUS.SUCCESS,
  }).catch(() => {});
  return sendSuccess(res, data);
});

// Alias tương thích ngược
export const recommendationController = {
  suggestByKeyword,
};
