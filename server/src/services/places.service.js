// server/src/services/places.service.js
import { getDistance } from 'geolib';
import Fuse from 'fuse.js';
import { LRUCache } from 'lru-cache';
import config from '../config/index.js';
import { placeRepository } from '../repositories/place.repository.js';

const getZiomapUrl = () => process.env.ZIOMAP_API_URL || config.ziomapApiUrl || 'https://ziomap-api.socibi.com/api/place/text-search';
const getZiomapApiKey = () => process.env.ZIOMAP_API_KEY;

// Chỉ xin các trường cần dùng để giữ chi phí ở mức thấp nhất
const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.photos';
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

export const VEGETARIAN_COVER_PHOTOS = [
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80',
];

export const defaultPlacePhoto = (key = '') => {
  const str = String(key ?? '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return VEGETARIAN_COVER_PHOTOS[Math.abs(hash) % VEGETARIAN_COVER_PHOTOS.length];
};

/**
 * Tự động trích xuất hoặc nhận diện thành phố từ địa chỉ hoặc chi tiết của quán
 * Hỗ trợ các tỉnh thành lớn: Hà Nội, Hồ Chí Minh, Đà Nẵng, Cần Thơ, Huế...
 */
export function detectCityFromAddress(address, detailsCity) {
  if (detailsCity && typeof detailsCity === 'string' && detailsCity.trim()) {
    return detailsCity.trim();
  }
  const addr = String(address || '');
  if (/Hà Nội/i.test(addr)) return 'Hà Nội';
  if (/Đà Nẵng/i.test(addr)) return 'Đà Nẵng';
  if (/Cần Thơ/i.test(addr)) return 'Cần Thơ';
  if (/Huế|Thừa Thiên/i.test(addr)) return 'Huế';
  if (/Hồ Chí Minh|TP\.?HCM|Sài Gòn/i.test(addr)) return 'Hồ Chí Minh';
  return 'Hồ Chí Minh';
}

const distanceMeters = (from, to) =>
  from && to?.latitude != null && to?.longitude != null
    ? getDistance(from, { latitude: to.latitude, longitude: to.longitude })
    : null;

// Món của quán = danh sách công thức / món ăn quán đang phục vụ qua bảng restaurant_recipes
const dishesOf = (restaurant) => {
  const recipeNames = restaurant.restaurant_recipes
    ?.map((rr) => rr.recipe?.recipe_name)
    .filter(Boolean) ?? [];
  return [...new Set(recipeNames)];
};

const toPlace = (restaurant, origin, extra = {}, userOrigin = null) => {
  const lat = restaurant.latitude != null ? Number(restaurant.latitude) : null;
  const lng = restaurant.longitude != null ? Number(restaurant.longitude) : null;
  const location = lat != null && lng != null ? { latitude: lat, longitude: lng } : null;

  return {
    id: `local_${restaurant.restaurant_id}`,
    source: restaurant.source || 'local',
    restaurant_id: restaurant.restaurant_id,
    name: restaurant.name,
    address: restaurant.address,
    city: detectCityFromAddress(restaurant.address, restaurant.details?.city),
    hours: restaurant.details?.hours || 'Chưa cập nhật',
    price_range: restaurant.details?.price_range || 'Theo thời giá',
    separate: restaurant.details?.separate_kitchen ?? null,
    latitude: lat,
    longitude: lng,
    phone: restaurant.phone ?? null,
    diet_type_id: restaurant.diet_type_id ?? null,
    diet_type: restaurant.diet_type?.name ?? null,
    rating: restaurant.rating != null ? Number(restaurant.rating) : null,
    image_url:
      restaurant.image_url ||
      defaultPlacePhoto(restaurant.name || restaurant.restaurant_id),
    place_id: restaurant.place_id ?? null,
    distance_m: origin && location ? distanceMeters(origin, location) : null,
    user_distance_m: userOrigin && location ? distanceMeters(userOrigin, location) : null,
    maps_url: location
      ? mapsUrl({ latitude: lat, longitude: lng, place_id: restaurant.place_id })
      : null,
    ...extra,
  };
};

const byDistance = (a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity);

/** Quán trong DB nằm trong bán kính, xếp từ gần đến xa. */
export async function findNearbyLocal({ lat, lng, radiusKm, userOrigin = null, dietTypeId = null }) {
  const origin = { latitude: lat, longitude: lng };
  const restaurants = await placeRepository.findNearbyCandidates({ lat, lng, radiusKm, dietTypeId });

  return restaurants
    .map((restaurant) => toPlace(restaurant, origin, {}, userOrigin))
    .filter((place) => place.distance_m !== null && place.distance_m <= radiusKm * 1000)
    .sort(byDistance);
}

/** Tìm quán trong DB theo tên quán hoặc tên món (không dấu, cho phép gõ sai nhẹ). */
export async function searchLocal({ query, lat, lng }) {
  const origin = lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : null;
  const restaurants = await placeRepository.findRestaurants({
    include: {
      diet_type: true,
      restaurant_recipes: {
        include: {
          recipe: true,
        },
      },
    },
  });

  const docs = restaurants.map((restaurant) => ({
    restaurant,
    name: normalize(restaurant.name),
    dishes: dishesOf(restaurant).map((dish) => ({
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

// Chỉ xin đúng số quán còn thiếu cho gọn dữ liệu. Key gửi qua header, không qua URL.
function requestZiomap({ query, lat, lng, radiusKm, limit }) {
  const url = getZiomapUrl();
  const apiKey = getZiomapApiKey();
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
  return fetchZiomap(`${url}?${params}`, {
    headers: { 'x-api-key': apiKey || '' },
  });
}

/**
 * Tìm quán qua ZIOMAP (tương thích Places API v1, khoảng 5 credit mỗi lần gọi). Chỉ gọi khi có
 * ZIOMAP_API_KEY; kết quả cache 24 giờ theo ô toạ độ (~100 m) để tránh gọi lặp và tiết kiệm phí.
 */
export async function searchZiomap({ query, lat, lng, radiusKm, limit, userOrigin = null }) {
  const apiKey = getZiomapApiKey();
  if (!apiKey) return { places: [], skipped: true, cached: false };

  const cacheKey = [normalize(query), lat.toFixed(3), lng.toFixed(3), radiusKm, limit].join('|');
  const hit = ziomapCache.get(cacheKey);
  if (hit) {
    const cachedPlaces = userOrigin
      ? hit.map((p) => ({
          ...p,
          user_distance_m:
            p.latitude != null && p.longitude != null
              ? distanceMeters(userOrigin, { latitude: p.latitude, longitude: p.longitude })
              : null,
        }))
      : hit;
    return { places: cachedPlaces, skipped: false, cached: true };
  }

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
      image_url:
        p.photos?.[0]?.photoUri ||
        p.photos?.[0]?.name ||
        p.photoUri ||
        p.image_url ||
        defaultPlacePhoto(p.displayName?.text || p.id),
      place_id: p.id,
      distance_m: distanceMeters(origin, location),
      user_distance_m: userOrigin ? distanceMeters(userOrigin, location) : null,
      maps_url: mapsUrl({ ...location, place_id: p.id }),
    };
  });
  ziomapCache.set(cacheKey, places);

  // Tự động lưu cache các quán ZIOMAP vào PostgreSQL khi không phải môi trường test (bất đồng bộ, không chặn response)
  if (process.env.NODE_ENV !== 'test') {
    placeRepository.saveExternalPlaces(places).catch((err) => {
      console.warn('[places.service] Lỗi tự động lưu cache ZIOMAP vào DB:', err.message);
    });
  }

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

const reverseGeocodeCache = new LRUCache({ max: 500, ttl: CACHE_TTL_MS });

export function clearReverseGeocodeCache() {
  reverseGeocodeCache.clear();
}

/**
 * Tra cứu địa chỉ thực tế từ tọa độ GPS (Reverse Geocoding)
 * @param {{ lat: number, lng: number }}
 * @returns {Promise<{ address: string, displayName: string, city: string }>}
 */
export async function reverseGeocode({ lat, lng }) {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = reverseGeocodeCache.get(cacheKey);
  if (cached) return cached;

  const fallbackAddress = `Tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  let result = {
    address: fallbackAddress,
    displayName: fallbackAddress,
    city: 'Hồ Chí Minh',
  };

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ChayXanh/1.0 (contact@chayxanh.vn)' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const rawName = data.display_name || '';
      const clean = rawName
        .replace(/,\s*\d{5,6}/g, '')
        .replace(/,\s*Việt Nam$/i, '')
        .trim();
      const city = detectCityFromAddress(clean, data.address?.city || data.address?.state);
      result = {
        address: clean || fallbackAddress,
        displayName: rawName || fallbackAddress,
        city,
      };
      reverseGeocodeCache.set(cacheKey, result);
    }
  } catch {
    // Không ném lỗi làm crash hệ thống, dùng fallback coordinates
  }

  return result;
}
