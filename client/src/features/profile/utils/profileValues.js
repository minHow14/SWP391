// client/src/features/profile/utils/profileValues.js
function normalizeGenderValue(gender) {
  if (!gender) return '';
  const s = String(gender).trim().toUpperCase();
  if (['MALE', 'NAM', 'M'].includes(s)) return 'MALE';
  if (['FEMALE', 'NỮ', 'NU', 'F'].includes(s)) return 'FEMALE';
  if (['OTHER', 'KHÁC', 'KHAC', 'O'].includes(s)) return 'OTHER';
  return '';
}

export function profileValues(user) {
  const profile = user.health_profile;
  return {
    full_name: user.full_name,
    height: profile?.height ?? '',
    weight: profile?.weight ?? '',
    dob: profile?.dob?.slice(0, 10) || '',
    gender: normalizeGenderValue(profile?.gender),
    diet_type_id: profile?.diet_type_id ?? '',
    health_goal: profile?.health_goal || '',
    allergy_ids: (user.allergies || []).map((allergy) => allergy.ingredient_id),
  };
}

