// D:/SWP391/SWP391/client/src/features/restaurants/utils/restaurantSort.js
function minimumMenuPrice(place) {
  const prices = (place.menu || [])
    .map((item) => item.price)
    .filter((price) => typeof price === 'number' || (typeof price === 'string' && price.trim() !== ''))
    .map(Number)
    .filter((price) => Number.isFinite(price) && price >= 0);
  return prices.length ? Math.min(...prices) : Infinity;
}

export function compareRestaurantPrices(left, right) {
  const leftPrice = minimumMenuPrice(left);
  const rightPrice = minimumMenuPrice(right);
  return leftPrice === rightPrice ? 0 : leftPrice - rightPrice;
}
