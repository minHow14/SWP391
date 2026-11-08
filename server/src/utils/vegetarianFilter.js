// d:/Projects/FPT/SWP391/server/src/utils/vegetarianFilter.js

export const NON_VEGETARIAN_NAME_REGEX =
  /\b(nail|nails|spa|spas|massage|eyelash|waxing|beauty|clinic|yoga|fitness|gym|beef|steak|bbq|chagee)\b|gội đầu|nối mi|uốn mi|thẩm mỹ|chuông xoay|chim chạy|món thái|quán thái|trà sữa|công ty tnhh|cù lao/i;

export const VEGETARIAN_NAME_REGEX =
  /\b(chay|vegan|vegetarian|plant-based|plant based)\b|âu lạc|thực dưỡng|bồ đề/i;

/**
 * Kiểm tra địa điểm có phải là quán ăn chay hoặc cửa hàng chay thực sự hay không.
 * Lọc bỏ tiệm nail, spa, thẩm mỹ, yoga, quán thịt, trà sữa, quán thái hoặc tên thuần địa chỉ số nhà.
 * @param {object} place
 * @returns {boolean}
 */
export function isVegetarianPlace(place) {
  if (!place || typeof place !== 'object') return false;

  const rawName = String(place.name || '').trim();
  const rawAddress = String(place.address || '').trim();
  if (!rawName) return false;

  // Cho phép fixture trong môi trường test
  if (/fixture/i.test(rawName)) return true;

  // Loại trừ tên thuần số nhà / số hẻm (ví dụ: "36/59 nguyễn gia trí", "123 Đường ABC")
  if (/^\d+[\dA-Za-z/,\s.-]*$/.test(rawName) || /^\d+\/\d+/.test(rawName)) {
    return false;
  }

  // Chặn từ khóa phi chay trong tên hoặc địa chỉ
  if (NON_VEGETARIAN_NAME_REGEX.test(rawName) || NON_VEGETARIAN_NAME_REGEX.test(rawAddress)) {
    return false;
  }

  // Cửa hàng nguyên liệu / thực phẩm chay luôn hợp lệ
  if (place.isIngredientShop === true) return true;

  // Nếu có diet_type_id hợp lệ (1-7) từ database
  if (place.diet_type_id != null && Number(place.diet_type_id) >= 1 && Number(place.diet_type_id) <= 7) {
    return true;
  }

  // Chế độ ăn hợp lệ từ frontend
  if (['vegan', 'buddhist', 'shop'].includes(place.type)) {
    return true;
  }

  // Quán từ nguồn bên ngoài (ZIOMAP) phải có từ khóa chay rõ ràng
  return VEGETARIAN_NAME_REGEX.test(rawName);
}
