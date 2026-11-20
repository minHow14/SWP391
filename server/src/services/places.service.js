// d:/Projects/FPT/SWP391/server/src/services/places.service.js
// Nghiệp vụ tìm quán chay: tìm quanh vị trí và theo tên/món trong DB, bổ sung kết quả từ ZIOMAP (có cache) rồi gộp và xếp theo khoảng cách.
import { getDistance } from 'geolib';
import Fuse from 'fuse.js';
import { LRUCache } from 'lru-cache';
import { placeRepository } from '../repositories/place.repository.js';
import { placePhotoUrl } from '../utils/placePhoto.js';
import { isVegetarianPlace } from '../utils/vegetarianFilter.js';

// Export lại bộ lọc quán chay để controller/test dùng chung một quy tắc.
export { isVegetarianPlace };

const ZIOMAP_TEXT_SEARCH_URL = 'https://ziomap-api.socibi.com/api/place/text-search';
const ZIOMAP_PHOTOS_URL = 'https://ziomap-api.socibi.com/api/place/photos';
// Chỉ xin các trường cần dùng để giữ chi phí ở mức thấp nhất
const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.photos';
// Timeout 8 giây cho nhà cung cấp ngoài để tìm kiếm không bị treo.
const PROVIDER_TIMEOUT_MS = 8000;
// Ngân sách 3 giây cho việc lấy ảnh, chạy 2 ảnh song song để không bị nhà cung cấp chặn vì gọi dồn.
const PHOTO_RESOLUTION_BUDGET_MS = 3000;
const PHOTO_CONCURRENCY = 2;
// Cache kết quả ZIOMAP 24 giờ vì dữ liệu quán ít thay đổi và mỗi lần gọi đều tốn phí.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Lỗi khi gọi nhà cung cấp địa điểm bên ngoài, để controller trả thông báo phù hợp.
export class PlacesProviderError extends Error {}

// Cache LRU trong bộ nhớ, tối đa 500 truy vấn.
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

// Tạo link Google Maps theo tọa độ, kèm place_id nếu có để mở đúng địa điểm.
export const mapsUrl = ({ latitude, longitude, place_id }) =>
  'https://www.google.com/maps/search/?api=1' +
  `&query=${latitude},${longitude}` +
  (place_id ? `&query_place_id=${encodeURIComponent(place_id)}` : '');

// Các từ chung chung bị bỏ khi tìm kiếm mờ vì xuất hiện trong tên hầu hết các quán.
const GENERIC_QUERY_WORDS = new Set(['chay', 'quan', 'nha', 'hang', 'mon', 'an', 'vegan', 'vegetarian']);

// Khoảng cách (mét) giữa hai điểm; null nếu thiếu tọa độ.
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

// Chuyển bản ghi nhà hàng DB sang định dạng quán thống nhất trả cho client (dùng chung với kết quả ZIOMAP).
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
    // Ưu tiên trường riêng, sau đó tới details cũ, cuối cùng suy ra từ địa chỉ.
    city: restaurant.city || restaurant.details?.city || (restaurant.address?.includes('Hà Nội') ? 'Hà Nội' : 'Hồ Chí Minh'),
    hours: restaurant.hours || restaurant.details?.hours || 'Chưa cập nhật',
    price_range: restaurant.priceRange || restaurant.details?.price_range || 'Theo thời giá',
    separate: restaurant.separateKitchen ?? restaurant.details?.separate_kitchen ?? null,
    latitude: lat,
    longitude: lng,
    phone: restaurant.phone ?? null,
    isIngredientShop: restaurant.isIngredientShop ?? false,
    diet_type_id: restaurant.diet_type_id ?? null,
    diet_type: restaurant.diet_type?.name ?? null,
    rating: restaurant.rating != null ? Number(restaurant.rating) : null,
    image_url: placePhotoUrl(restaurant.image_url),
    place_id: restaurant.place_id ?? null,
    distance_m: origin && location ? distanceMeters(origin, location) : null,
    user_distance_m: userOrigin && location ? distanceMeters(userOrigin, location) : null,
    maps_url: location
      ? mapsUrl({ latitude: lat, longitude: lng, place_id: restaurant.place_id })
      : null,
    ...extra,
  };
};

// So sánh theo khoảng cách tăng dần; quán không có khoảng cách xếp cuối.
const byDistance = (a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity);

/** Quán trong DB nằm trong bán kính, xếp từ gần đến xa. */
export async function findNearbyLocal({ lat, lng, radiusKm, userOrigin = null, dietTypeId = null }) {
  const origin = { latitude: lat, longitude: lng };
  const restaurants = await placeRepository.findNearbyCandidates({ lat, lng, radiusKm, dietTypeId });

  return restaurants
    .map((restaurant) => toPlace(restaurant, origin, {}, userOrigin))
    // Bounding box ở DB chỉ lọc thô; lọc lại theo khoảng cách thật để loại các góc của hình vuông.
    .filter((place) => place.distance_m !== null && place.distance_m <= radiusKm * 1000 && isVegetarianPlace(place))
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

  // Trọng số món ăn cao hơn tên quán vì người dùng thường tìm theo món; threshold 0.3 cho phép gõ sai nhẹ.
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
    .filter(isVegetarianPlace)
    .sort((a, b) => b.match_score - a.match_score || byDistance(a, b));
}

// Gọi API ZIOMAP với timeout; mọi lỗi mạng, HTTP hoặc JSON đều quy về PlacesProviderError.
async function fetchZiomap(url, init) {
  let response;
  try {
    const timeout = AbortSignal.timeout(PROVIDER_TIMEOUT_MS);
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    response = await fetch(url, { ...init, signal });
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

// Kiểm tra tọa độ là số hữu hạn và nằm trong giới hạn (90 cho vĩ độ, 180 cho kinh độ).
const isCoordinate = (value, limit) => Number.isFinite(value) && Math.abs(value) <= limit;

// Lấy URL ảnh của địa điểm: dùng URL có sẵn nếu hợp lệ, không thì gọi API ảnh của ZIOMAP; lỗi thì trả null.
export async function resolvePlacePhoto({ placeId, photo, signal }) {
  const direct = placePhotoUrl(photo?.photoUri);
  if (direct) return direct;
  const name = photo?.name;
  // Chỉ chấp nhận tên ảnh thuộc đúng place_id để không bị lợi dụng truy vấn ảnh tùy ý.
  if (signal?.aborted || !process.env.ZIOMAP_API_KEY || !name?.startsWith(`places/${placeId}/photos/`)) return null;
  try {
    const params = new URLSearchParams({ name, maxWidthPx: '800', skipHttpRedirect: 'true' });
    const result = await fetchZiomap(`${ZIOMAP_PHOTOS_URL}?${params}`, {
      headers: { 'x-api-key': process.env.ZIOMAP_API_KEY }, redirect: 'error', signal,
    });
    return placePhotoUrl(result.photoUri);
  } catch {
    return null;
  }
}

// Lấy ảnh cho danh sách quán theo từng lô nhỏ trong giới hạn thời gian chung.
async function resolveSearchPhotos(places) {
  const signal = AbortSignal.timeout(PHOTO_RESOLUTION_BUDGET_MS);
  const resolved = [];
  // Các ảnh dùng chung một ngân sách thời gian để nhà cung cấp ảnh chậm không chặn kết quả tìm kiếm hợp lệ.
  for (let offset = 0; offset < places.length; offset += PHOTO_CONCURRENCY) {
    const batch = places.slice(offset, offset + PHOTO_CONCURRENCY);
    resolved.push(...await Promise.all(batch.map(async (place) => ({ ...place,
      photoUrl: placePhotoUrl(place.photoUri || place.image_url)
        || await resolvePlacePhoto({ placeId: place.id, photo: place.photos?.[0], signal }),
    }))));
  }
  return resolved;
}

// Chỉ xin đúng số quán còn thiếu cho gọn dữ liệu. Key (Base64 JSON) gửi qua header, không qua URL.
function requestZiomap({ query, lat, lng, radiusKm, limit }) {
  const params = new URLSearchParams({
    query,
    languageCode: 'vi',
    // Giới hạn 1..20 kết quả và bán kính tối đa 50 km theo giới hạn của API.
    maxResultCount: String(Math.min(Math.max(Number(limit) || 10, 1), 20)),
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
export async function searchZiomap({ query, lat, lng, radiusKm, limit, userOrigin = null }) {
  if (!process.env.ZIOMAP_API_KEY) return { places: [], skipped: true, cached: false };

  const cacheKey = [normalize(query), lat.toFixed(3), lng.toFixed(3), radiusKm, limit].join('|');
  const hit = ziomapCache.get(cacheKey);
  if (hit) {
    // Kết quả cache dùng chung cho mọi người nên phải tính lại khoảng cách tới vị trí người dùng hiện tại.
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
  const resolved = await resolveSearchPhotos(valid);
  const places = resolved
    .map((p) => {
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
        image_url: p.photoUrl,
        place_id: p.id,
        distance_m: distanceMeters(origin, location),
        user_distance_m: userOrigin ? distanceMeters(userOrigin, location) : null,
        maps_url: mapsUrl({ ...location, place_id: p.id }),
      };
    })
    // Chỉ giữ quán chay; quán không chay từ nguồn ngoài bị loại trước khi lưu và trả về.
    .filter(isVegetarianPlace);
  // Tự động lưu cache các quán ZIOMAP vào PostgreSQL khi không phải môi trường test
  if (process.env.NODE_ENV !== 'test') {
    try {
      const saved = await placeRepository.saveExternalPlaces(places);
      // Gắn restaurant_id vừa lưu để client mở được trang chi tiết quán trong hệ thống.
      const savedMap = new Map(saved.map((r) => [r.place_id, r.restaurant_id]));
      for (const place of places) {
        if (place.place_id && savedMap.has(place.place_id)) {
          place.restaurant_id = savedMap.get(place.place_id);
        }
      }
    } catch (err) {
      console.warn('[places.service] Lỗi tự động lưu cache ZIOMAP vào DB:', err.message);
    }
  }

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
        // Cùng tên (không dấu) và cách nhau dưới 100 m được coi là cùng một quán.
        (l) => normalize(l.name) === normalize(place.name) && distanceMeters(l, place) < 100
      );
    if (!duplicate) merged.push(place);
  }
  return merged.sort(byDistance);
}

// Xóa cache ZIOMAP (dùng trong test hoặc khi admin cần làm mới).
export function clearZiomapCache() {
  ziomapCache.clear();
}
