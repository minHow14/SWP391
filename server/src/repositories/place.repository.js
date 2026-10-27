// d:\Projects\FPT\SWP391\server\src\repositories\place.repository.js
import prisma from '../config/prisma.js';

export const placeRepository = {
  /**
   * Truy vấn danh sách nhà hàng lân cận ứng dụng Bounding Box lọc trực tiếp trên PostgreSQL
   */
  async findNearbyCandidates({ lat, lng, radiusKm } = {}, db = prisma) {
    const where = {
      latitude: { not: null },
      longitude: { not: null },
    };

    if (lat !== undefined && lng !== undefined && radiusKm !== undefined) {
      const deltaLat = radiusKm / 111.0;
      const cosLat = Math.cos((Number(lat) * Math.PI) / 180.0);
      const deltaLng = radiusKm / (111.0 * (Math.abs(cosLat) > 0.001 ? Math.abs(cosLat) : 1));

      where.latitude = {
        gte: Number(lat) - deltaLat,
        lte: Number(lat) + deltaLat,
      };
      where.longitude = {
        gte: Number(lng) - deltaLng,
        lte: Number(lng) + deltaLng,
      };
    }

    return db.restaurant.findMany({
      where,
      include: {
        diet_type: true,
        restaurant_recipes: {
          include: {
            recipe: true,
          },
        },
      },
    });
  },

  async findRestaurants(args = {}, db = prisma) {
    return db.restaurant.findMany(args);
  },

  async findById(restaurantId, db = prisma) {
    return db.restaurant.findUnique({
      where: { restaurant_id: Number(restaurantId) },
    });
  },

  async create(data, db = prisma) {
    return db.restaurant.create({ data });
  },

  async update(restaurantId, data, db = prisma) {
    return db.restaurant.update({
      where: { restaurant_id: Number(restaurantId) },
      data,
    });
  },
};
