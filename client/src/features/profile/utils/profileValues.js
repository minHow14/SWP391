// client/src/features/profile/utils/profileValues.js
// Chuyển dữ liệu người dùng từ API thành giá trị khởi tạo cho form hồ sơ.
// Chuẩn hóa giới tính về MALE/FEMALE/OTHER vì dữ liệu cũ có thể lưu dạng tiếng Việt hoặc viết tắt.
function normalizeGenderValue(gender) {
  if (!gender) return '';
  const s = String(gender).trim().toUpperCase();
  if (['MALE', 'NAM', 'M'].includes(s)) return 'MALE';
  if (['FEMALE', 'NỮ', 'NU', 'F'].includes(s)) return 'FEMALE';
  if (['OTHER', 'KHÁC', 'KHAC', 'O'].includes(s)) return 'OTHER';
  return '';
}

// Tạo giá trị form hồ sơ từ user; giá trị thiếu được đổi thành chuỗi rỗng để input luôn có kiểm soát.
export function profileValues(user) {
  const profile = user.health_profile;
  return {
    full_name: user.full_name,
    height: profile?.height ?? '',
    weight: profile?.weight ?? '',
    // Chỉ lấy phần ngày (YYYY-MM-DD) vì input type="date" không nhận chuỗi ISO đầy đủ.
    dob: profile?.dob?.slice(0, 10) || '',
    gender: normalizeGenderValue(profile?.gender),
    diet_type_id: profile?.diet_type_id ?? '',
    health_goal: profile?.health_goal || '',
    allergy_ids: (user.allergies || []).map((allergy) => allergy.ingredient_id),
  };
}

