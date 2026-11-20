// d:\Projects\FPT\SWP391\server\src\controllers\places.controller.js
// Controller tìm quán ăn chay: ưu tiên dữ liệu trong DB, chỉ gọi ZIOMAP bổ sung khi thiếu
// để tiết kiệm credit; mỗi lần gợi ý đều ghi nhật ký AI (lỗi ghi log không ảnh hưởng response).
import { z } from 'zod';
import { ok, fail } from '../utils/apiResponse.js';
import { aiLogService } from '../services/aiLogService.js';
import { AI_LOG_STATUS } from '../constants/aiLogs.js';
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

// Số nguyên tùy chọn, chuỗi rỗng coi như không gửi.
const optionalInteger = (min = 1) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().int().min(min).optional()
  );

// Tọa độ tâm tìm kiếm, giới hạn theo phạm vi vĩ độ/kinh độ hợp lệ.
const coordinates = {
  lat: optionalNumber(-90, 90),
  lng: optionalNumber(-180, 180),
};

// Query của /places/nearby: user_lat/user_lng là vị trí thật của người dùng (để tính khoảng cách),
// có thể khác tâm tìm kiếm lat/lng; bán kính 0.1–50 km để tránh truy vấn quá rộng.
const nearbySchema = z.object({
  ...coordinates,
  user_lat: optionalNumber(-90, 90),
  user_lng: optionalNumber(-180, 180),
  radius_km: optionalNumber(0.1, 50).default(5),
  limit: optionalNumber(1, 100).default(20),
  diet_type_id: optionalInteger(1),
});

// Query của /places/search: từ khóa 1–100 ký tự, tối đa 20 kết quả để giới hạn chi phí ZIOMAP.
const searchSchema = z.object({
  q: z.string().trim().min(1).max(100),
  ...coordinates,
  radius_km: optionalNumber(0.1, 50).default(10),
  limit: optionalNumber(1, 20).default(10),
});

// Trả lỗi 400 kèm danh sách field không hợp lệ từ Zod.
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
  try {
    ziomap = await searchZiomap({ query, lat, lng, radiusKm, limit: limit - local.length, userOrigin });
  } catch (error) {
    if (!(error instanceof PlacesProviderError)) throw error;
    providerError = error;
  }
  // locationBias chỉ ưu tiên chứ không giới hạn vùng, nên tự loại các quán ngoài bán kính
  const withinRadius = ziomap.places.filter((place) => place.distance_m <= radiusKm * 1000);
  const places = mergePlaces(local, withinRadius).slice(0, limit);
  return { places, ziomap, providerError };
}

// Mô tả nguồn ZIOMAP trong meta: unavailable (lỗi), not_configured (chưa cấu hình key), cached, used.
const sourcesMeta = (ziomap, providerError) => ({
  ziomap: providerError
    ? 'unavailable'
    : ziomap.skipped
      ? 'not_configured'
      : ziomap.cached
        ? 'cached'
        : 'used',
});

// GET /places/nearby: tìm quán quanh tọa độ, bắt buộc có cả lat và lng.
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
    diet_type_id: dietTypeId,
  } = parsed.data;
  if (lat === undefined || lng === undefined) {
    return fail(res, 400, 'INVALID_INPUT', 'Cần cung cấp cả lat và lng.');
  }

  const userOrigin =
    userLat !== undefined && userLng !== undefined ? { latitude: userLat, longitude: userLng } : null;

  const local = await findNearbyLocal({ lat, lng, radiusKm, userOrigin, dietTypeId });
  // DB đã đủ kết quả thì không gọi ZIOMAP để tiết kiệm phí
  if (local.length >= limit) {
    aiLogService.recordLog({
      modelName: 'Internal / DeepSeek',
      action: 'RECOMMENDATION_NEARBY',
      status: AI_LOG_STATUS.SUCCESS,
    }).catch(() => {});
    return ok(res, { places: local.slice(0, limit) }, 200, { ziomap: 'not_needed' });
  }

  const { places, ziomap, providerError } = await withZiomap(
    { query: 'quán chay', lat, lng, radiusKm, limit, userOrigin },
    local
  );
  if (providerError && places.length === 0) {
    aiLogService.recordLog({
      modelName: 'Internal / DeepSeek',
      action: 'RECOMMENDATION_NEARBY',
      status: AI_LOG_STATUS.ERROR,
      errorFeedback: 'ZIOMAP tạm thời không phản hồi.',
    }).catch(() => {});
    return fail(res, 502, 'PLACES_PROVIDER_ERROR', 'ZIOMAP tạm thời không phản hồi.');
  }
  aiLogService.recordLog({
    modelName: 'Internal / DeepSeek',
    action: 'RECOMMENDATION_NEARBY',
    status: AI_LOG_STATUS.SUCCESS,
  }).catch(() => {});
  return ok(res, { places }, 200, sourcesMeta(ziomap, providerError));
}

// GET /places/search: tìm quán theo từ khóa; lat/lng tùy chọn nhưng phải đi cặp.
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
    aiLogService.recordLog({
      modelName: 'Internal / DeepSeek',
      action: 'RECOMMENDATION_SEARCH',
      status: AI_LOG_STATUS.SUCCESS,
    }).catch(() => {});
    return ok(res, { places: local }, 200, { ziomap: 'not_needed' });
  }

  // Thêm "chay" vào từ khóa để ZIOMAP chỉ trả quán chay.
  const query = normalize(q).includes('chay') ? q : `${q} chay`;
  const { places, ziomap, providerError } = await withZiomap(
    { query, lat, lng, radiusKm, limit },
    local
  );
  if (providerError && places.length === 0) {
    aiLogService.recordLog({
      modelName: 'Internal / DeepSeek',
      action: 'RECOMMENDATION_SEARCH',
      status: AI_LOG_STATUS.ERROR,
      errorFeedback: 'ZIOMAP tạm thời không phản hồi.',
    }).catch(() => {});
    return fail(res, 502, 'PLACES_PROVIDER_ERROR', 'ZIOMAP tạm thời không phản hồi.');
  }
  aiLogService.recordLog({
    modelName: 'Internal / DeepSeek',
    action: 'RECOMMENDATION_SEARCH',
    status: AI_LOG_STATUS.SUCCESS,
  }).catch(() => {});
  return ok(res, { places }, 200, sourcesMeta(ziomap, providerError));
}
