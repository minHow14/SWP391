import { getDistance } from 'geolib';
import Fuse from 'fuse.js';
import { LRUCache } from 'lru-cache';
import {
  restaurants,
  restaurantMenuItems,
  restaurantRecipes,
  recipes,
} from '../data/mockStore.js';

const ZIOMAP_TEXT_SEARCH_URL = 'https://ziomap-api.socibi.com/api/place/text-search';
// Chỉ xin các trường cần dùng để giữ chi phí ở mức thấp nhất
const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.rating';
const PROVIDER_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export class PlacesProviderError extends Error {}

const ziomapCache = new LRUCache({ max: 500, ttl: CACHE_TTL_MS });

// Bỏ dấu tiếng Việt để "pho chay" khớp "Phở chay"
export const normalize = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

export const mapsUrl = ({ latitude, longitude, place_id }) =>
  'https://www.google.com/maps/search/?api=1' +
  `&query=${latitude},${longitude}` +
  (place_id ? `&query_place_id=${encodeURIComponent(place_id)}` : '');

const GENERIC_QUERY_WORDS = new Set(['chay', 'quan', 'nha', 'hang', 'mon', 'an', 'vegan', 'vegetarian']);

const distanceMeters = (from, to) =>
  from ? getDistance(from, { latitude: to.latitude, longitude: to.longitude }) : null;

// Món của quán = menu dạng văn bản + công thức quán đang phục vụ
const dishesOf = (restaurantId) => {
  const menu = restaurantMenuItems
    .filter((item) => item.restaurant_id === restaurantId)
    .map((item) => item.dish_name);
  const recipeNames = restaurantRecipes
    .filter((rr) => rr.restaurant_id === restaurantId)
    .map((rr) => recipes.find((r) => r.recipe_id === rr.recipe_id)?.recipe_name)
    .filter(Boolean);
  return [...new Set([...menu, ...recipeNames])];
};

const toPlace = (restaurant, origin, extra = {}) => ({
  id: `local_${restaurant.restaurant_id}`,
  source: 'local',
  restaurant_id: restaurant.restaurant_id,
  name: restaurant.name,
  address: restaurant.address,
  latitude: restaurant.latitude,
  longitude: restaurant.longitude,
  phone: restaurant.phone ?? null,
  diet_type_id: restaurant.diet_type_id ?? null,
  rating: null,
  place_id: restaurant.google_place_id ?? null,
  distance_m: distanceMeters(origin, restaurant),
  maps_url: mapsUrl({
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    place_id: restaurant.google_place_id,
  }),
  ...extra,
});

const byDistance = (a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity);

/** Quán trong DB nằm trong bán kính, xếp từ gần đến xa. */
export function findNearbyLocal({ lat, lng, radiusKm }) {
  const origin = { latitude: lat, longitude: lng };
  return restaurants
    .map((restaurant) => toPlace(restaurant, origin))
    .filter((place) => place.distance_m <= radiusKm * 1000)
    .sort(byDistance);
}

/** Tìm quán trong DB theo tên quán hoặc tên món (không dấu, cho phép gõ sai nhẹ). */
export function searchLocal({ query, lat, lng }) {
  const origin = lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : null;
  const docs = restaurants.map((restaurant) => ({
    restaurant,
    name: normalize(restaurant.name),
    dishes: dishesOf(restaurant.restaurant_id).map((dish) => ({
      original: dish,
      text: normalize(dish),
    })),
  }));

  const fuse = new Fuse(docs, {
    keys: [
      { name: 'name', weight: 2 },
      { name: 'dishes.text', weight: 3 },
    ],
    threshold: 0.3,
    ignoreLocation: true,
    includeScore: true,
  });

  // Bỏ các từ chung như "chay", "quán" để "phở chay" không khớp mọi quán có chữ "Chay" trong tên
  const words = normalize(query).split(/\s+/).filter((word) => !GENERIC_QUERY_WORDS.has(word));
  const needle = words.length > 0 ? words.join(' ') : normalize(query);
  return fuse
    .search(needle)
    .map(({ item, score }) => {
      const matchedDishes = item.dishes
        .filter((dish) => dish.text.includes(needle))
        .map((dish) => dish.original);
      return toPlace(item.restaurant, origin, {
        match_score: Number((1 - score).toFixed(3)),
        matched_dishes: matchedDishes,
      });
    })
    .sort((a, b) => b.match_score - a.match_score || byDistance(a, b));
}

async function fetchZiomap(url, init) {
  let response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
  } catch (error) {
    throw new PlacesProviderError(`Không gọi được ZIOMAP: ${error.name}`);
  }
  if (!response.ok) {
    throw new PlacesProviderError(`ZIOMAP trả về HTTP ${response.status}`);
  }
  try {
    return await response.json();
  } catch {
    throw new PlacesProviderError('ZIOMAP trả về dữ liệu không phải JSON');
  }
}

const isCoordinate = (value, limit) => Number.isFinite(value) && Math.abs(value) <= limit;

// Chỉ xin đúng số quán còn thiếu cho gọn dữ liệu. Key (Base64 JSON) gửi qua header, không qua URL.
function requestZiomap({ query, lat, lng, radiusKm, limit }) {
  const params = new URLSearchParams({
    query,
    languageCode: 'vi',
    maxResultCount: String(limit),
    fieldMask: FIELD_MASK,
    locationBias: JSON.stringify({
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: Math.min(radiusKm * 1000, 50000),
      },
    }),
  });
  return fetchZiomap(`${ZIOMAP_TEXT_SEARCH_URL}?${params}`, {
    headers: { 'x-api-key': process.env.ZIOMAP_API_KEY },
  });
}

/**
 * Tìm quán qua ZIOMAP (tương thích Places API v1, khoảng 5 credit mỗi lần gọi). Chỉ gọi khi có
 * ZIOMAP_API_KEY; kết quả cache 24 giờ theo ô toạ độ (~100 m) để tránh gọi lặp và tiết kiệm phí.
 */
export async function searchZiomap({ query, lat, lng, radiusKm, limit }) {
  if (!process.env.ZIOMAP_API_KEY) return { places: [], skipped: true, cached: false };

  const cacheKey = [normalize(query), lat.toFixed(3), lng.toFixed(3), radiusKm, limit].join('|');
  const hit = ziomapCache.get(cacheKey);
  if (hit) return { places: hit, skipped: false, cached: true };

  const body = await requestZiomap({ query, lat, lng, radiusKm, limit });
  const origin = { latitude: lat, longitude: lng };
  // Bỏ qua quán thiếu id hoặc toạ độ hợp lệ thay vì làm hỏng cả response
  const raw = Array.isArray(body?.places) ? body.places : [];
  const valid = raw.filter(
    (p) => p?.id && isCoordinate(p.location?.latitude, 90) && isCoordinate(p.location?.longitude, 180)
  );
  const places = valid.map((p) => {
    const location = { latitude: p.location.latitude, longitude: p.location.longitude };
    return {
      id: `ziomap_${p.id}`,
      source: 'ziomap',
      restaurant_id: null,
      name: p.displayName?.text ?? '',
      address: p.formattedAddress ?? '',
      ...location,
      phone: null,
      diet_type_id: null,
      rating: p.rating ?? null,
      place_id: p.id,
      distance_m: distanceMeters(origin, location),
      maps_url: mapsUrl({ ...location, place_id: p.id }),
    };
  });
  ziomapCache.set(cacheKey, places);
  return { places, skipped: false, cached: false };
}

/** Gộp kết quả DB và ZIOMAP, bỏ trùng theo place_id hoặc tên + vị trí, xếp theo khoảng cách. */
export function mergePlaces(local, ziomap) {
  const seen = new Set(local.map((p) => p.place_id).filter(Boolean));
  const merged = [...local];
  for (const place of ziomap) {
    const duplicate =
      seen.has(place.place_id) ||
      local.some(
        (l) => normalize(l.name) === normalize(place.name) && distanceMeters(l, place) < 100
      );
    if (!duplicate) merged.push(place);
  }
  return merged.sort(byDistance);
}

export function clearZiomapCache() {
  ziomapCache.clear();
}
