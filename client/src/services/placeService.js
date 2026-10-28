// client/src/services/placeService.js
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
};
