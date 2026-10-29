// d:\Projects\FPT\SWP391\server\src\routes\workspace.route.js
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
router.get('/catalog', workspaceController.getCatalog);
router.get('/recipes', workspaceController.getRecipes);
router.get('/ingredients', workspaceController.getIngredients);
router.get('/ingredients/:id/image', workspaceController.getIngredientImage);

// Tất cả các route bên dưới đều yêu cầu xác thực JWT Bearer
router.use(authenticate);

router.get('/mine', workspaceController.getMine);
router.get('/journal', workspaceController.getJournal);
router.patch('/profile', validate(workspaceProfileSchema), workspaceController.updateProfile);
router.post('/diary', validate(diaryEntrySchema), workspaceController.addDiaryEntry);
router.delete('/diary/:id', validate(idParamsSchema, 'params'), workspaceController.deleteDiaryEntry);
router.put('/plan', validate(mealPlanSchema), workspaceController.setMealPlan);
router.post('/plan/apply-ai', validate(applyAiMealPlanSchema), workspaceController.applyAiMealPlan);
router.post('/plan/record', validate(planRecordSchema), workspaceController.recordPlanToDiary);
router.post('/restaurants', validate(suggestRestaurantSchema), workspaceController.suggestRestaurant);
router.post(
  '/restaurants/:id/reviews',
  validate(idParamsSchema, 'params'),
  validate(restaurantReviewSchema),
  workspaceController.reviewRestaurant
);

export default router;
