// JavaScript source code
import { ingredientService } from '../services/ingredient.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

export const getLiquidIngredientDensities = asyncHandler(async (req, res) => {
    const densities = await ingredientService.getLiquidIngredientDensities();
    return sendSuccess(res, { data: densities });
});

export const getLiquidIngredientDensity = asyncHandler(async (req, res) => {
    const { ingredientId } = req.params;
    const density = await ingredientService.getLiquidDensityByIngredientId(ingredientId);

    if (!density) {
        return sendSuccess(res, { data: null });
    }

    return sendSuccess(res, { data: density });
});

export const createLiquidIngredientDensity = asyncHandler(async (req, res) => {
    const result = await ingredientService.createLiquidIngredientDensity(req.body);
    return sendSuccess(res, { data: result }, 201);
});

export const updateLiquidIngredientDensity = asyncHandler(async (req, res) => {
    const { ingredientId } = req.params;
    const result = await ingredientService.updateLiquidIngredientDensity(ingredientId, req.body);
    return sendSuccess(res, { data: result });
});

export const deleteLiquidIngredientDensity = asyncHandler(async (req, res) => {
    const { ingredientId } = req.params;
    const result = await ingredientService.deleteLiquidIngredientDensity(ingredientId);
    return sendSuccess(res, { data: result });
});