// d:\Projects\FPT\SWP391\server\src\routes\workspace.route.js
// Router không gian cá nhân (/api/v1/workspace): catalog món/nguyên liệu, nhật ký ăn uống,
// thực đơn, hồ sơ dinh dưỡng và quán ăn gợi ý.
import { Router } from 'express';
import * as workspaceController from '../controllers/workspace.controller.js';
import { loadCatalog } from '../services/workspace.service.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import {
  workspaceProfileSchema,
  diaryEntrySchema,
  mealPlanSchema,
  planRecordSchema,
  applyAiMealPlanSchema,
  suggestRestaurantSchema,
  restaurantReviewSchema,
} from '../validators/workspace.validator.js';
import { idParamsSchema } from '../validators/common.validator.js';

const router = Router();

// Tương thích ngược cho các nơi import loadCatalog từ workspace.route.js
export { loadCatalog };

// Endpoints công khai
// GET /workspace/catalog — [Công khai] Toàn bộ catalog công thức & nguyên liệu.
router.get('/catalog', workspaceController.getCatalog);
// GET /workspace/recipes — [Công khai] Danh sách công thức món ăn.
router.get('/recipes', workspaceController.getRecipes);
// GET /workspace/ingredients — [Công khai] Danh sách nguyên liệu.
router.get('/ingredients', workspaceController.getIngredients);
// GET /workspace/ingredients/:id/image — [Công khai] Ảnh của nguyên liệu.
router.get('/ingredients/:id/image', workspaceController.getIngredientImage);

// Tất cả các route bên dưới đều yêu cầu xác thực JWT Bearer
router.use(authenticate);

// GET /workspace/mine — [Đăng nhập] Dữ liệu workspace của tôi (hồ sơ, thực đơn, nhật ký...).
router.get('/mine', workspaceController.getMine);
// GET /workspace/journal — [Đăng nhập] Nhật ký ăn uống theo ngày.
router.get('/journal', workspaceController.getJournal);
// PATCH /workspace/profile — [Đăng nhập] Cập nhật hồ sơ dinh dưỡng (mục tiêu, chế độ ăn...).
router.patch('/profile', validate(workspaceProfileSchema), workspaceController.updateProfile);
// POST /workspace/diary — [Đăng nhập] Thêm món vào nhật ký ăn uống.
router.post('/diary', validate(diaryEntrySchema), workspaceController.addDiaryEntry);
// DELETE /workspace/diary/:id — [Đăng nhập, chủ nhật ký] Xóa một mục nhật ký.
router.delete('/diary/:id', validate(idParamsSchema, 'params'), workspaceController.deleteDiaryEntry);
// PUT /workspace/plan — [Đăng nhập] Ghi đè thực đơn của tôi.
router.put('/plan', validate(mealPlanSchema), workspaceController.setMealPlan);
// POST /workspace/plan/apply-ai — [Đăng nhập] Áp dụng thực đơn do AI sinh vào thực đơn của tôi.
router.post('/plan/apply-ai', validate(applyAiMealPlanSchema), workspaceController.applyAiMealPlan);
// POST /workspace/plan/record — [Đăng nhập] Chuyển các món trong thực đơn vào nhật ký đã ăn.
router.post('/plan/record', validate(planRecordSchema), workspaceController.recordPlanToDiary);
// POST /workspace/restaurants — [Đăng nhập] Đề xuất thêm một quán ăn.
router.post('/restaurants', validate(suggestRestaurantSchema), workspaceController.suggestRestaurant);
// POST /workspace/restaurants/:id/reviews — [Đăng nhập] Đánh giá một quán ăn.
router.post(
  '/restaurants/:id/reviews',
  validate(idParamsSchema, 'params'),
  validate(restaurantReviewSchema),
  workspaceController.reviewRestaurant
);

export default router;
