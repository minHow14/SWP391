// D:/SWP391/SWP391/server/src/services/ingredientLookupAiService.js
// Gọi AI Service để sinh thông tin nguyên liệu (mô tả, dinh dưỡng) và kiểm tra chặt dữ liệu AI trả về.
import { aiConfig } from '../config/aiConfig.js';
import { sendAiJson } from './aiTransportService.js';
import { aiGatewayError, normalizeAiError } from '../utils/aiGatewayError.js';
import { ingredientLookupResultSchema } from '../validators/ingredientLookupValidator.js';
import { INGREDIENT_LOOKUP_AI_PATH } from '../constants/ingredientLookup.js';

// Gửi tên nguyên liệu sang AI và trả về thông tin nguyên liệu đã được validate bằng schema.
export async function generateIngredientInformation({ job, signal }) {
  // Luôn có deadline riêng để một lần gọi AI treo không chiếm worker vô thời hạn; gộp với signal hủy từ bên ngoài nếu có.
  const deadline = AbortSignal.timeout(aiConfig.timeoutMs);
  const activeSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  try {
    const response = await sendAiJson({ path: INGREDIENT_LOOKUP_AI_PATH,
      payload: { ingredientName: job.ingredientName }, signal: activeSignal, requestId: job.id });
    // Không tin dữ liệu AI: phải đúng envelope `success` và qua schema Zod mới được dùng.
    const result = ingredientLookupResultSchema.safeParse(response?.data);
    if (response?.success !== true || !result.success) throw aiGatewayError({ status: 502,
      code: 'INGREDIENT_LOOKUP_INVALID_OUTPUT', message: 'AI trả về thông tin nguyên liệu không hợp lệ.' });
    // AI xác nhận đây không phải nguyên liệu ăn được -> báo 422 để người dùng sửa tên, không coi là lỗi hệ thống.
    if (!result.data.isIngredient) throw aiGatewayError({ status: 422,
      code: 'INGREDIENT_NOT_RECOGNIZED', message: 'AI không nhận ra tên nguyên liệu này.' });
    return result.data.ingredient;
  } catch (error) { throw normalizeAiError(error, activeSignal); }
}
