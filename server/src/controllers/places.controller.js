// d:\Projects\FPT\SWP391\server\src\controllers\places.controller.js
import { z } from 'zod';
import { ok, fail } from '../utils/apiResponse.js';
import {
  PlacesProviderError,
  findNearbyLocal,
  mergePlaces,
  normalize,
  searchZiomap,
  searchLocal,
} from '../services/places.service.js';

// Chuỗi rỗng ("?lat=") coi như không gửi
const optionalNumber = (min, max) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().min(min).max(max).optional()
  );

const optionalInteger = (min = 1, max = undefined) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    max !== undefined
      ? z.coerce.number().int().min(min).max(max).optional()
      : z.coerce.number().int().min(min).optional()
  );

const coordinates = {
  lat: optionalNumber(-90, 90),
  lng: optionalNumber(-180, 180),
};

const nearbySchema = z.object({
  ...coordinates,
  user_lat: optionalNumber(-90, 90),
  user_lng: optionalNumber(-180, 180),
  radius_km: optionalNumber(0.1, 50).default(5),
  limit: optionalInteger(1, 100).default(12),
  page: optionalInteger(1).default(1),
  diet_type_id: optionalInteger(1),
});

const searchSchema = z.object({
  q: z.string().trim().min(1).max(100),
  ...coordinates,
  radius_km: optionalNumber(0.1, 50).default(10),
  limit: optionalInteger(1, 100).default(10),
});

const invalid = (res, error) =>
  fail(res, 400, 'INVALID_INPUT', 'Dữ liệu đầu vào không hợp lệ.', error.issues.map((i) => ({
    field: i.path.join('.'),
    message: i.message,
  })));

// Gọi ZIOMAP để bổ sung kết quả; lỗi không làm hỏng kết quả trong DB.
// ZIOMAP tính khoảng 5 credit mỗi lần gọi, nên chỉ gọi khi DB thiếu quán và chỉ xin số còn thiếu.
async function withZiomap({ query, lat, lng, radiusKm, limit, userOrigin = null }, local) {
  let ziomap = { places: [], skipped: false, cached: false };
  let providerError = null;
  const neededCount = Math.max(limit - local.length, 0);
  if (neededCount > 0) {
    try {
      ziomap = await searchZiomap({ query, lat, lng, radiusKm, limit: neededCount, userOrigin });
    } catch (error) {
      if (!(error instanceof PlacesProviderError)) throw error;
      providerError = error;
    }
  }
  // locationBias chỉ ưu tiên chứ không giới hạn vùng, nên tự loại các quán ngoài bán kính
  const withinRadius = ziomap.places.filter((place) => place.distance_m <= radiusKm * 1000);
  const places = mergePlaces(local, withinRadius);
  return { places, ziomap, providerError };
}

const sourcesMeta = (ziomap, providerError) => ({
  ziomap: providerError
    ? 'unavailable'
    : ziomap.skipped
      ? 'not_configured'
      : ziomap.cached
        ? 'cached'
        : 'used',
});

export async function getNearby(req, res) {
  const parsed = nearbySchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error);
  const {
    lat,
    lng,
    user_lat: userLat,
    user_lng: userLng,
    radius_km: radiusKm,
    limit,
    page,
    diet_type_id: dietTypeId,
  } = parsed.data;
  if (lat === undefined || lng === undefined) {
    return fail(res, 400, 'INVALID_INPUT', 'Cần cung cấp cả lat và lng.');
  }

  const userOrigin =
    userLat !== undefined && userLng !== undefined ? { latitude: userLat, longitude: userLng } : null;

  const local = await findNearbyLocal({ lat, lng, radiusKm, userOrigin, dietTypeId });
  const startIndex = (page - 1) * limit;

  // DB đã đủ kết quả cho trang yêu cầu thì không gọi ZIOMAP để tiết kiệm phí
  if (local.length >= page * limit) {
    const paginated = local.slice(startIndex, startIndex + limit);
    return ok(res, { places: paginated }, 200, {
      page,
      limit,
      total: local.length,
      hasMore: startIndex + paginated.length < local.length,
      ziomap: 'not_needed',
    });
  }

  const { places, ziomap, providerError } = await withZiomap(
    { query: 'quán chay', lat, lng, radiusKm, limit: Math.max(page * limit, limit), userOrigin },
    local
  );
  if (providerError && places.length === 0) {
    return fail(res, 502, 'PLACES_PROVIDER_ERROR', 'ZIOMAP tạm thời không phản hồi.');
  }

  const paginated = places.slice(startIndex, startIndex + limit);
  return ok(res, { places: paginated }, 200, {
    page,
    limit,
    total: places.length,
    hasMore: startIndex + paginated.length < places.length,
    ...sourcesMeta(ziomap, providerError),
  });
}

export async function searchPlaces(req, res) {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error);
  const { q, lat, lng, radius_km: radiusKm, limit } = parsed.data;
  if ((lat === undefined) !== (lng === undefined)) {
    return fail(res, 400, 'INVALID_INPUT', 'lat và lng phải đi cùng nhau.');
  }

  const local = (await searchLocal({ query: q, lat, lng })).slice(0, limit);
  // Chỉ hỏi ZIOMAP khi DB không có quán phù hợp và biết vị trí người dùng
  if (local.length > 0 || lat === undefined) {
    return ok(res, { places: local }, 200, { ziomap: 'not_needed' });
  }

  const query = normalize(q).includes('chay') ? q : `${q} chay`;
  const { places, ziomap, providerError } = await withZiomap(
    { query, lat, lng, radiusKm, limit },
    local
  );
  if (providerError && places.length === 0) {
    return fail(res, 502, 'PLACES_PROVIDER_ERROR', 'ZIOMAP tạm thời không phản hồi.');
  }
  return ok(res, { places: places.slice(0, limit) }, 200, sourcesMeta(ziomap, providerError));
}
