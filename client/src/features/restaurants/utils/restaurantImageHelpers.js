// D:/SWP391/SWP391/client/src/features/restaurants/utils/restaurantImageHelpers.js

/**
 * Xác định phân loại hình ảnh fallback cho quán chay:
 * - 'shop': Cửa hàng nguyên liệu/thực phẩm chay
 * - 'buddhist': Quán chay phong cách Phật giáo (dietTypeId = 5)
 * - 'vegan': Quán thuần chay (dietTypeId = 1)
 * - 'separate': Cơm chay thông thường / có bếp riêng
 */
export function resolveRestaurantCategory(options = {}) {
  const { type, dietTypeId, isShop } = options || {};
  if (isShop || type === 'shop') return 'shop';
  if (type === 'buddhist' || dietTypeId === 5) return 'buddhist';
  if (type === 'vegan' || dietTypeId === 1) return 'vegan';
  return 'separate';
}

/**
 * Trích xuất ký tự đầu tiên đại diện cho quán chay để làm chữ cái thương hiệu (Initial Lettermark).
 * Luôn trả về chữ in hoa, tự động xử lý khoảng trắng thừa hoặc chuỗi rỗng.
 */
export function getRestaurantInitial(name, alt) {
  const candidate = (typeof name === 'string' && name.trim()) ||
    (typeof alt === 'string' && alt.trim()) ||
    'Quán Chay';
  return candidate.trim().charAt(0).toUpperCase() || 'C';
}

/**
 * Tạo aria-label trợ năng cho người khiếm thị khi quán chưa có ảnh thật
 */
export function getRestaurantFallbackAriaLabel(name, alt) {
  const candidate = (typeof name === 'string' && name.trim()) ||
    (typeof alt === 'string' && alt.trim()) ||
    'quán';
  return `Chưa có ảnh thực tế của ${candidate.trim()}`;
}
