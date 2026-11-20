// D:/SWP391/SWP391/client/src/features/restaurants/utils/restaurantSort.js
// Tiện ích sắp xếp quán chay theo giá món rẻ nhất trong thực đơn.
// Lấy giá thấp nhất trong thực đơn; quán không có giá hợp lệ trả về Infinity để bị xếp cuối.
function minimumMenuPrice(place) {
  const prices = (place.menu || [])
    .map((item) => item.price)
    .filter((price) => typeof price === 'number' || (typeof price === 'string' && price.trim() !== ''))
    .map(Number)
    .filter((price) => Number.isFinite(price) && price >= 0);
  return prices.length ? Math.min(...prices) : Infinity;
}

// Hàm so sánh dùng cho Array.sort: quán có món rẻ hơn đứng trước.
export function compareRestaurantPrices(left, right) {
  const leftPrice = minimumMenuPrice(left);
  const rightPrice = minimumMenuPrice(right);
  return leftPrice === rightPrice ? 0 : leftPrice - rightPrice;
}
