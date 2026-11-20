// d:\Projects\FPT\SWP391\server\src\controllers\workspace.controller.js
// Controller không gian cá nhân: catalog món/nguyên liệu, nhật ký ăn uống, thực đơn, hồ sơ và quán ăn.
import { workspaceService } from '../services/workspace.service.js';
import { mealPlanJournalService } from '../services/mealPlanJournalService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

// Toàn bộ catalog công thức & nguyên liệu.
export const getCatalog = asyncHandler(async (req, res) => {
  const catalog = await workspaceService.loadCatalog();
  return sendSuccess(res, { data: catalog });
});

// Danh sách công thức có phân trang/lọc.
export const getRecipes = asyncHandler(async (req, res) => {
  const result = await workspaceService.getRecipes(req.query);
  return sendSuccess(res, { recipes: result.recipes, meta: result.meta });
});

// Danh sách nguyên liệu có phân trang/lọc.
export const getIngredients = asyncHandler(async (req, res) => {
  const result = await workspaceService.getIngredients(req.query);
  return sendSuccess(res, { ingredients: result.ingredients, meta: result.meta });
});

// Bài viết của người dùng hiện tại.
export const getMine = asyncHandler(async (req, res) => {
  const posts = await workspaceService.getMyPosts(req.user.user_id);
  return sendSuccess(res, { data: posts });
});

// Nhật ký ăn uống của người dùng hiện tại.
export const getJournal = asyncHandler(async (req, res) => {
  const journal = await workspaceService.getJournal(req.user.user_id);
  return sendSuccess(res, { data: journal });
});

// Cập nhật hồ sơ dinh dưỡng.
export const updateProfile = asyncHandler(async (req, res) => {
  const result = await workspaceService.updateProfile(req.user.user_id, req.body);
  return sendSuccess(res, { data: result });
});

// Thêm một mục vào nhật ký ăn uống.
export const addDiaryEntry = asyncHandler(async (req, res) => {
  const entry = await workspaceService.addDiaryEntry(req.user.user_id, req.body);
  return sendSuccess(res, { data: entry });
});

// Xóa một mục nhật ký (service kiểm tra thuộc về người dùng).
export const deleteDiaryEntry = asyncHandler(async (req, res) => {
  const result = await workspaceService.deleteDiaryEntry(req.user.user_id, req.params.id);
  return sendSuccess(res, { data: result });
});

// Lưu thực đơn của người dùng.
export const setMealPlan = asyncHandler(async (req, res) => {
  const result = await workspaceService.setMealPlan(req.user.user_id, req.body);
  return sendSuccess(res, { data: result });
});

// Ghi các món trong thực đơn vào nhật ký đã ăn.
export const recordPlanToDiary = asyncHandler(async (req, res) => {
  const result = await workspaceService.recordPlanToDiary(req.user.user_id, req.body);
  return sendSuccess(res, { data: result });
});

// Áp dụng thực đơn AI sinh ra vào thực đơn/nhật ký của người dùng.
export const applyAiMealPlan = asyncHandler(async (req, res) => {
  const result = await mealPlanJournalService.applyAiMealPlan(req.user.user_id, req.body);
  return sendSuccess(res, { data: result });
});

// Người dùng đề xuất thêm quán ăn.
export const suggestRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await workspaceService.suggestRestaurant(req.body);
  return sendSuccess(res, { data: restaurant });
});

// Người dùng đánh giá một quán ăn.
export const reviewRestaurant = asyncHandler(async (req, res) => {
  const result = await workspaceService.reviewRestaurant(req.user.user_id, req.params.id, req.body);
  return sendSuccess(res, { data: result });
});

// Trả ảnh nguyên liệu dạng nhị phân, cache 1 ngày kèm ETag.
// nosniff + CSP chặt để trình duyệt không thực thi nội dung độc hại nếu ảnh bị giả mạo (vd SVG chứa script).
export const getIngredientImage = asyncHandler(async (req, res) => {
  const { bytes, mimeType, etag } = await workspaceService.getIngredientImage(req.params.id);
  res.set({
    'Content-Type': mimeType,
    'Cache-Control': 'public, max-age=86400',
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
  });
  return res.send(bytes);
});
