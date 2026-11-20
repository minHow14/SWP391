// D:/SWP391/SWP391/server/src/services/ingredientLookupProcessor.js
// Worker xử lý một job tra cứu nguyên liệu bằng AI: gọi AI rồi ghi kết quả hoặc đánh dấu thất bại.
import { generateIngredientInformation } from './ingredientLookupAiService.js';
import { ingredientLookupService } from './ingredientLookupService.js';

// Xử lý một job tra cứu nguyên liệu; `signal` cho phép hủy khi worker dừng hoặc mất quyền giữ job.
export async function processIngredientLookupJob(job, { signal } = {}) {
  try {
    const result = await generateIngredientInformation({ job, signal });
    // Kiểm tra lại sau khi AI trả về: nếu job đã bị hủy thì không được ghi kết quả.
    signal?.throwIfAborted();
    return await ingredientLookupService.complete({ job, result });
  } catch (error) {
    // Mất lease nghĩa là worker khác đã nhận job; ném tiếp để không ghi đè trạng thái job của worker đó.
    if (error.errorCode === 'INGREDIENT_LOOKUP_LEASE_LOST') throw error;
    return ingredientLookupService.fail({ job, errorCode: error.errorCode || 'INGREDIENT_LOOKUP_FAILED' });
  }
}
