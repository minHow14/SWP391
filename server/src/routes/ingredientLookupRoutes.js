// D:/SWP391/SWP391/server/src/routes/ingredientLookupRoutes.js
// Router job tra cứu nguyên liệu bằng AI (/api/v1/ingredient-lookup-jobs).
import { Router } from 'express';
import { authenticateAiCaller, resolveAiIdentity } from '../middlewares/aiIdentityMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { ingredientLookupSchema, ingredientLookupParamsSchema } from '../validators/ingredientLookupValidator.js';
import { createIngredientLookup, getIngredientLookup } from '../controllers/ingredientLookupController.js';

export const ingredientLookupRoutes = Router();
// Cho phép khách hoặc thành viên; token gửi kèm (nếu có) phải hợp lệ.
ingredientLookupRoutes.use(authenticateAiCaller, resolveAiIdentity);
// POST /ingredient-lookup-jobs — [Khách hoặc thành viên] Tạo job tra cứu nguyên liệu.
ingredientLookupRoutes.post('/', validate(ingredientLookupSchema), createIngredientLookup);
// GET /ingredient-lookup-jobs/:id — [Khách hoặc thành viên, chủ job] Lấy kết quả tra cứu.
ingredientLookupRoutes.get('/:id', validate(ingredientLookupParamsSchema, 'params'), getIngredientLookup);
