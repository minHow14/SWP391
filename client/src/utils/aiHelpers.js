// client/src/utils/aiHelpers.js
// Hàm thuần (không phụ thuộc React) để nối dữ liệu của web với API AI.

const strip = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

/** diet_type_id của web -> dietary_type của AI. Chay Phật giáo dùng 'vegan' (không sản phẩm động vật, an toàn nhất). */
export function dietTypeToAi(dietTypeId) {
  return { 1: 'vegan', 2: 'lacto', 3: 'ovo', 4: 'lacto_ovo', 5: 'vegan', 6: 'lacto_ovo' }[Number(dietTypeId)];
}

export function genderToAi(gender) {
  const value = strip(gender);
  if (['male', 'nam', 'm'].includes(value)) return 'male';
  if (['female', 'nu', 'f'].includes(value)) return 'female';
  return value ? 'other' : undefined;
}

/** Mục tiêu sức khoẻ gõ tự do ("Giảm cân", "Tăng cơ"...) -> weight_loss | muscle_gain | maintenance. */
export function goalToAi(text) {
  const value = strip(text);
  if (/giam|lose|loss|slim/.test(value)) return 'weight_loss';
  if (/tang co|tang can|muscle|gain|bulk/.test(value)) return 'muscle_gain';
  return 'maintenance';
}

export function calcBmi(heightCm, weightKg) {
  const height = Number(heightCm) / 100;
  const weight = Number(weightKg);
  if (!(height > 0) || !(weight > 0)) return null;
  return Math.round((weight / (height * height)) * 10) / 10;
}

/** Phân loại BMI chuẩn châu Á - Thái Bình Dương. */
export function bmiCategory(bmi) {
  if (!Number.isFinite(bmi)) return '';
  if (bmi < 18.5) return 'Thiếu cân';
  if (bmi < 23) return 'Bình thường';
  if (bmi < 25) return 'Thừa cân';
  return 'Béo phì';
}

/** BMI hiển thị một chữ số thập phân kiểu Việt Nam: 22 -> "22,0". */
export const formatBmi = (bmi) => (bmi == null || bmi === '' || !Number.isFinite(Number(bmi)) ? '' : Number(bmi).toFixed(1).replace('.', ','));

export function ageFromDob(dob, now = new Date()) {
  const birth = new Date(`${String(dob).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const before =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (before) age -= 1;
  return age >= 10 && age <= 120 ? age : null;
}

/** Giá trị điền sẵn cho form thực đơn từ hồ sơ người dùng (nếu có) và chế độ ăn đang chọn. */
export function mealPlanDefaults({ user, ingredients = [], dietTypeId } = {}) {
  const profile = user?.health_profile;
  const names = new Map(ingredients.map((item) => [item.ingredient_id, item.name]));
  return {
    height_cm: profile?.height ?? '',
    weight_kg: profile?.weight ?? '',
    age: (profile?.dob && ageFromDob(profile.dob)) || '',
    gender: genderToAi(profile?.gender) || '',
    goal: goalToAi(profile?.health_goal),
    activity_level: 'light',
    dietary_type: dietTypeToAi(profile?.diet_type_id ?? dietTypeId) || 'vegan',
    allergies: (user?.allergies || []).map((item) => names.get(item.ingredient_id) || item.name).filter(Boolean),
    available_ingredients: [],
    days: 7,
  };
}

/** Body gửi tới /meal-planner/generate/stream từ giá trị của form (bỏ trường trống). */
export function buildMealPlanRequest(values) {
  const number = (value) => (value === '' || value == null ? undefined : Number(value));
  const height = number(values.height_cm);
  const weight = number(values.weight_kg);
  const request = {
    height_cm: height,
    weight_kg: weight,
    bmi: calcBmi(height, weight) ?? undefined,
    age: number(values.age),
    gender: values.gender || undefined,
    goal: values.goal,
    activity_level: values.activity_level,
    dietary_type: values.dietary_type,
    allergies: values.allergies?.length ? values.allergies : undefined,
    available_ingredients: values.available_ingredients?.length ? values.available_ingredients : undefined,
    days: number(values.days),
  };
  return Object.fromEntries(Object.entries(request).filter(([, value]) => value !== undefined));
}

/** Kiểm tra form phía client; trả về { field: thông báo }. */
export function validateMealPlanValues(values) {
  const errors = {};
  const height = Number(values.height_cm);
  const weight = Number(values.weight_kg);
  if (!(height > 50 && height < 260)) errors.height_cm = 'Chiều cao từ 51 đến 259 cm.';
  if (!(weight > 20 && weight < 300)) errors.weight_kg = 'Cân nặng từ 21 đến 299 kg.';
  if (values.age !== '' && !(Number(values.age) >= 10 && Number(values.age) <= 120)) errors.age = 'Tuổi từ 10 đến 120.';
  if (!(Number(values.days) >= 1 && Number(values.days) <= 7)) errors.days = 'Số ngày từ 1 đến 7.';
  return errors;
}

export const MAX_MENU_CONTEXT = 8000;

/** Thực đơn rút gọn để chatbot giải thích (API giới hạn 8000 ký tự). */
export function planToMenuContext(plan, limit = MAX_MENU_CONTEXT - 400) {
  const profile = plan.profile_summary || {};
  const header = `${plan.title}. Mục tiêu ${profile.target_daily_calories} kcal/ngày, BMI ${profile.bmi} (${profile.bmi_category}), chế độ ${profile.dietary_type}.`;
  const build = (withIngredients) =>
    [
      header,
      ...plan.weekly_plan.map((day) => {
        const meals = [['sáng', day.breakfast], ['trưa', day.lunch], ['tối', day.dinner], ['phụ', day.snacks]]
          .filter(([, meal]) => meal)
          .map(([label, meal]) => {
            const base = `${label}: ${meal.name} (${meal.estimated_calories} kcal, ${meal.protein_g}g đạm)`;
            return withIngredients ? `${base} [${meal.ingredients.slice(0, 5).join(', ')}]` : base;
          });
        return `${day.day}: ${meals.join('; ')}`;
      }),
    ].join('\n');
  const full = build(true);
  if (full.length <= limit) return full;
  const short = build(false);
  return short.length <= limit ? short : short.slice(0, limit);
}

/** Các tin nhắn hỏi đáp gần nhất để gửi làm `history` (chỉ tin của chatbot, tối đa 10). */
export function chatHistory(messages, max = 10) {
  return messages
    .filter((message) => message.kind === 'chat' && message.text && !message.error && !message.pending)
    .slice(-max)
    .map((message) => ({ role: message.role, content: message.text }));
}

export function formatReset(resetAt) {
  const date = new Date(resetAt);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Thông báo thân thiện cho người dùng theo mã lỗi của API AI. */
export function friendlyAiError(error) {
  const code = error?.code;
  if (code === 'CHAT_QUOTA_EXCEEDED' || code === 'MEAL_PLAN_QUOTA_EXCEEDED') {
    const reset = formatReset(error.details?.resetAt);
    return `Bạn đã dùng hết lượt hôm nay${reset ? `, lượt mới mở lúc ${reset}` : ''}. Đăng nhập để dùng không giới hạn.`;
  }
  if (code === 'RATE_LIMIT_EXCEEDED') return 'Bạn gửi quá nhanh. Vui lòng đợi vài giây rồi thử lại.';
  if (code === 'UNAUTHORIZED') return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (code === 'FORBIDDEN') return 'Bạn không có quyền sử dụng chức năng này.';
  if (code === 'AI_PROVIDER_ERROR' || code === 'PLACES_PROVIDER_ERROR') return 'Dịch vụ AI đang bận. Vui lòng thử lại sau ít phút.';
  if (code === 'SERVICE_UNAVAILABLE') return 'Hệ thống tạm thời không khả dụng. Vui lòng thử lại sau.';
  if (code === 'NETWORK_ERROR') return 'Không kết nối được dịch vụ AI. Hãy kiểm tra dịch vụ đã chạy chưa rồi thử lại.';
  if (code === 'INVALID_INPUT' && Array.isArray(error.details) && error.details[0]?.msg) {
    return `Dữ liệu chưa hợp lệ: ${error.details[0].msg}`;
  }
  return error?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
}

/** Có nên hiện nút "Đăng nhập" kèm lỗi (hết lượt của khách). */
export const isQuotaError = (error) => error?.code === 'CHAT_QUOTA_EXCEEDED' || error?.code === 'MEAL_PLAN_QUOTA_EXCEEDED';

/** Phần trăm thanh tiến độ theo giai đoạn của /meal-planner/generate/stream. */
export function stagePercent(stage) {
  return { calculating: 15, generating: 55, validating: 85, retrying: 40 }[stage] ?? 5;
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '';
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}
