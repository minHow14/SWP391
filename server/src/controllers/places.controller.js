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

const coordinates = {
  lat: optionalNumber(-90, 90),
  lng: optionalNumber(-180, 180),
};

const nearbySchema = z.object({
  ...coordinates,
  radius_km: optionalNumber(0.1, 50).default(5),
  limit: optionalNumber(1, 20).default(10),
});

const searchSchema = z.object({
  q: z.string().trim().min(1).max(100),
  ...coordinates,
  radius_km: optionalNumber(0.1, 50).default(10),
  limit: optionalNumber(1, 20).default(10),
});

const invalid = (res, error) =>
  fail(res, 400, 'INVALID_INPUT', 'Dữ liệu đầu vào không hợp lệ.', error.issues.map((i) => ({
    field: i.path.join('.'),
    message: i.message,
  })));

// Gọi ZIOMAP để bổ sung kết quả; lỗi không làm hỏng kết quả trong DB.
// ZIOMAP tính khoảng 5 credit mỗi lần gọi, nên chỉ gọi khi DB thiếu quán và chỉ xin số còn thiếu.
async function withZiomap({ query, lat, lng, radiusKm, limit }, local) {
  let ziomap = { places: [], skipped: false, cached: false };
  let providerError = null;
  try {
    ziomap = await searchZiomap({ query, lat, lng, radiusKm, limit: limit - local.length });
  } catch (error) {
    if (!(error instanceof PlacesProviderError)) throw error;
    providerError = error;
  }
  // locationBias chỉ ưu tiên chứ không giới hạn vùng, nên tự loại các quán ngoài bán kính
  const withinRadius = ziomap.places.filter((place) => place.distance_m <= radiusKm * 1000);
  const places = mergePlaces(local, withinRadius).slice(0, limit);
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
  const { lat, lng, radius_km: radiusKm, limit } = parsed.data;
  if (lat === undefined || lng === undefined) {
    return fail(res, 400, 'INVALID_INPUT', 'Cần cung cấp cả lat và lng.');
  }

  const local = await findNearbyLocal({ lat, lng, radiusKm });
  // DB đã đủ kết quả thì không gọi ZIOMAP để tiết kiệm phí
  if (local.length >= limit) {
    return ok(res, { places: local.slice(0, limit) }, 200, { ziomap: 'not_needed' });
  }

  const { places, ziomap, providerError } = await withZiomap(
    { query: 'quán chay', lat, lng, radiusKm, limit },
    local
  );
  if (providerError && places.length === 0) {
    return fail(res, 502, 'PLACES_PROVIDER_ERROR', 'ZIOMAP tạm thời không phản hồi.');
  }
  return ok(res, { places }, 200, sourcesMeta(ziomap, providerError));
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
  return ok(res, { places }, 200, sourcesMeta(ziomap, providerError));
}
