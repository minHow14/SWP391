// Router khối lượng riêng nguyên liệu lỏng (/api/v1/ingredients) dùng để quy đổi ml ↔ gram.
import { Router } from 'express';
import * as ingredientController from '../controllers/ingredient.controller.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Endpoint công khai
// GET /ingredients/liquid-densities — [Công khai] Danh sách khối lượng riêng các nguyên liệu lỏng.
router.get('/liquid-densities', ingredientController.getLiquidIngredientDensities);
// GET /ingredients/liquid-densities/:ingredientId — [Công khai] Khối lượng riêng của một nguyên liệu.
router.get('/liquid-densities/:ingredientId', ingredientController.getLiquidIngredientDensity);

// Endpoint chỉ dành cho ADMIN
router.use(authenticate, authorize(ROLES.ADMIN));
// POST /ingredients/liquid-densities — [ADMIN] Thêm khối lượng riêng cho nguyên liệu.
router.post('/liquid-densities', ingredientController.createLiquidIngredientDensity);
// PATCH /ingredients/liquid-densities/:ingredientId — [ADMIN] Cập nhật khối lượng riêng.
router.patch('/liquid-densities/:ingredientId', ingredientController.updateLiquidIngredientDensity);
// DELETE /ingredients/liquid-densities/:ingredientId — [ADMIN] Xóa khối lượng riêng.
router.delete('/liquid-densities/:ingredientId', ingredientController.deleteLiquidIngredientDensity);

export default router;