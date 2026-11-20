// Controller khối lượng riêng nguyên liệu lỏng (quy đổi ml ↔ gram khi tính dinh dưỡng).
import { ingredientService } from '../services/ingredient.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

// Lấy toàn bộ khối lượng riêng nguyên liệu lỏng.
export const getLiquidIngredientDensities = asyncHandler(async (req, res) => {
    const densities = await ingredientService.getLiquidIngredientDensities();
    return sendSuccess(res, { data: densities });
});

// Lấy khối lượng riêng của một nguyên liệu; không có thì trả data null thay vì 404
// để client tự dùng giá trị quy đổi mặc định.
export const getLiquidIngredientDensity = asyncHandler(async (req, res) => {
    const { ingredientId } = req.params;
    const density = await ingredientService.getLiquidDensityByIngredientId(ingredientId);

    if (!density) {
        return sendSuccess(res, { data: null });
    }

    return sendSuccess(res, { data: density });
});

// [ADMIN] Thêm khối lượng riêng cho nguyên liệu, trả 201.
export const createLiquidIngredientDensity = asyncHandler(async (req, res) => {
    const result = await ingredientService.createLiquidIngredientDensity(req.body);
    return sendSuccess(res, { data: result }, 201);
});

// [ADMIN] Cập nhật khối lượng riêng của nguyên liệu.
export const updateLiquidIngredientDensity = asyncHandler(async (req, res) => {
    const { ingredientId } = req.params;
    const result = await ingredientService.updateLiquidIngredientDensity(ingredientId, req.body);
    return sendSuccess(res, { data: result });
});

// [ADMIN] Xóa khối lượng riêng của nguyên liệu.
export const deleteLiquidIngredientDensity = asyncHandler(async (req, res) => {
    const { ingredientId } = req.params;
    const result = await ingredientService.deleteLiquidIngredientDensity(ingredientId);
    return sendSuccess(res, { data: result });
});