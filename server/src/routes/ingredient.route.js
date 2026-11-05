// JavaScript source code
import { Router } from 'express';
import * as ingredientController from '../controllers/ingredient.controller.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Public endpoints
router.get('/liquid-densities', ingredientController.getLiquidIngredientDensities);
router.get('/liquid-densities/:ingredientId', ingredientController.getLiquidIngredientDensity);

// Admin-only endpoints
router.use(authenticate, authorize(ROLES.ADMIN));
router.post('/liquid-densities', ingredientController.createLiquidIngredientDensity);
router.patch('/liquid-densities/:ingredientId', ingredientController.updateLiquidIngredientDensity);
router.delete('/liquid-densities/:ingredientId', ingredientController.deleteLiquidIngredientDensity);

export default router;