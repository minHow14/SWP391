// D:/SWP391/SWP391/server/src/routes/ingredientLookupRoutes.js
import { Router } from 'express';
import { authenticateAiCaller, resolveAiIdentity } from '../middlewares/aiIdentityMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { ingredientLookupSchema, ingredientLookupParamsSchema } from '../validators/ingredientLookupValidator.js';
import { createIngredientLookup, getIngredientLookup } from '../controllers/ingredientLookupController.js';

export const ingredientLookupRoutes = Router();
ingredientLookupRoutes.use(authenticateAiCaller, resolveAiIdentity);
ingredientLookupRoutes.post('/', validate(ingredientLookupSchema), createIngredientLookup);
ingredientLookupRoutes.get('/:id', validate(ingredientLookupParamsSchema, 'params'), getIngredientLookup);
