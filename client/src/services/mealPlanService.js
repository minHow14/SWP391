// D:/SWP391/SWP391/client/src/services/mealPlanService.js
// Dịch vụ tạo thực đơn tuần bằng AI: xác minh danh tính, đọc chế độ ăn đã lưu rồi gọi luồng tạo thực đơn.
import { authService } from './authService.js';
import { AiApiError, streamMealPlan } from './aiApi.js';
import { buildMealPlanRequest, dietTypeToAi } from '../utils/aiHelpers.js';
import { getSession, getSessionSnapshot } from '../utils/session.js';

// Ném lỗi nếu phiên đăng nhập đã đổi so với lúc bắt đầu, tránh tạo thực đơn cho nhầm tài khoản.
function ensureCurrentIdentity(snapshot, userId) {
  if (snapshot.userId !== (userId ?? null) || getSessionSnapshot().identityRevision !== snapshot.identityRevision) {
    throw new AiApiError({ status: 409, code: 'AI_SESSION_CHANGED',
      message: 'Phiên đăng nhập đã thay đổi. Vui lòng mở lại phần tạo thực đơn.' });
  }
}

// Đọc chế độ ăn từ hồ sơ mới nhất trên server (không tin dữ liệu cũ trong session),
// và báo lỗi nếu chế độ ăn vừa bị đổi hoặc chưa được chọn.
async function readSavedDiet({ snapshot, userId, signal }) {
  const previousDietId = getSession()?.user?.health_profile?.diet_type_id;
  const result = await authService.getMe({ signal }).catch((cause) => {
    throw new AiApiError({ status: cause.status || 0,
      code: cause.status === 401 ? 'UNAUTHORIZED' : 'PROFILE_READ_FAILED', cause,
      message: 'Không tải được hồ sơ. Vui lòng thử lại trước khi tạo thực đơn.' });
  });
  signal?.throwIfAborted();
  ensureCurrentIdentity(snapshot, userId);
  if (getSession()?.user?.health_profile?.diet_type_id !== previousDietId) {
    throw new AiApiError({ status: 409, code: 'PROFILE_DIET_CHANGED',
      message: 'Kiểu ăn chay vừa thay đổi. Vui lòng thử tạo thực đơn lại.' });
  }
  const user = result?.data?.user || result?.user;
  if (user?.user_id !== userId) throw new Error('Không thể xác minh hồ sơ cho tài khoản hiện tại.');
  const dietaryType = dietTypeToAi(user.health_profile?.diet_type_id);
  if (!dietaryType) {
    throw new AiApiError({ status: 422, code: 'PROFILE_DIET_REQUIRED',
      message: 'Vui lòng chọn kiểu ăn chay trong hồ sơ trước khi tạo thực đơn.' });
  }
  return dietaryType;
}

// Tạo thực đơn: người dùng đăng nhập dùng chế độ ăn trong hồ sơ, khách dùng giá trị trong form.
export async function generateMealPlan({ values, userId, signal, onProgress }) {
  const snapshot = getSessionSnapshot();
  ensureCurrentIdentity(snapshot, userId);
  const dietaryType = userId ? await readSavedDiet({ snapshot, userId, signal }) : values.dietaryType;
  signal?.throwIfAborted();
  return streamMealPlan({ request: buildMealPlanRequest({ ...values, dietaryType }), signal, onProgress });
}
