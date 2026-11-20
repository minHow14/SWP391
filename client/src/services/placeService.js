// client/src/services/placeService.js
// Dịch vụ tìm quán chay theo vị trí và từ khóa.
import apiClient from './apiClient.js';

export const placeService = {
  // Tìm kiếm quán chay lân cận theo tọa độ GPS, bán kính, chế độ ăn và vị trí thực tế của người dùng
  getNearbyPlaces: async (
    { lat, lng, userLat, userLng, radiusKm = 10, limit = 10, dietTypeId } = {},
    config = {}
  ) => {
    return apiClient.get('/places/nearby', {
      params: {
        lat,
        lng,
        user_lat: userLat,
        user_lng: userLng,
        radius_km: radiusKm,
        limit,
        diet_type_id: dietTypeId,
      },
      ...config,
    });
  },

  // Tìm kiếm quán chay theo từ khoá (tên quán, tên món), toạ độ và bán kính
  searchPlaces: async ({ q, lat, lng, radiusKm = 10, limit = 10 } = {}, config = {}) => {
    return apiClient.get('/places/search', {
      params: {
        q,
        lat,
        lng,
        radius_km: radiusKm,
        limit,
      },
      ...config,
    });
  },
};
