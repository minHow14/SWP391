// client/src/services/placeService.js
import apiClient from './apiClient.js';

export const placeService = {
  // Tìm kiếm quán chay lân cận theo tọa độ GPS và bán kính
  getNearbyPlaces: async ({ lat, lng, radiusKm = 10, limit = 10 } = {}, config = {}) => {
    return apiClient.get('/places/nearby', {
      params: {
        lat,
        lng,
        radius_km: radiusKm,
        limit,
      },
      ...config,
    });
  },
};
