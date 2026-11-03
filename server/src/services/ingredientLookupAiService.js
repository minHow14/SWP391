// D:/SWP391/SWP391/server/src/services/ingredientLookupAiService.js
import { aiConfig } from '../config/aiConfig.js';
import { sendAiJson } from './aiTransportService.js';
import { aiGatewayError, normalizeAiError } from '../utils/aiGatewayError.js';
import { ingredientLookupResultSchema } from '../validators/ingredientLookupValidator.js';
import { INGREDIENT_LOOKUP_AI_PATH } from '../constants/ingredientLookup.js';

export async function generateIngredientInformation({ job, signal }) {
  const deadline = AbortSignal.timeout(aiConfig.timeoutMs);
  const activeSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  try {
    const response = await sendAiJson({ path: INGREDIENT_LOOKUP_AI_PATH,
      payload: { ingredientName: job.ingredientName }, signal: activeSignal, requestId: job.id });
    const result = ingredientLookupResultSchema.safeParse(response?.data);
    if (response?.success !== true || !result.success) throw aiGatewayError({ status: 502,
      code: 'INGREDIENT_LOOKUP_INVALID_OUTPUT', message: 'AI trả về thông tin nguyên liệu không hợp lệ.' });
    if (!result.data.isIngredient) throw aiGatewayError({ status: 422,
      code: 'INGREDIENT_NOT_RECOGNIZED', message: 'AI không nhận ra tên nguyên liệu này.' });
    return result.data.ingredient;
  } catch (error) { throw normalizeAiError(error, activeSignal); }
}
