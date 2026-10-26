// d:\Projects\FPT\SWP391\server\src\repositories\place.repository.js
import prisma from '../config/prisma.js';

export const placeRepository = {
  /**
   * Truy vấn danh sách nhà hàng lân cận ứng dụng Bounding Box và lọc theo chế độ ăn trên PostgreSQL
   */
  async findNearbyCandidates(
    { lat, lng, radiusKm, dietTypeId, status = 'APPROVED' } = {},
    db = prisma
  ) {
    const where = {
      latitude: { not: null },
      longitude: { not: null },
    };

    if (status) {
      where.status = status;
    }

    if (dietTypeId !== undefined && dietTypeId !== null) {
      where.diet_type_id = Number(dietTypeId);
    }

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
        details: true,
        restaurant_recipes: {
          include: {
            recipe: true,
          },
        },
      },
    });
  },

  /**
   * Cơ chế Cache-through (Read-through): Tự động lưu các quán chay thực tế lấy từ ZIOMAP vào PostgreSQL
   * Giúp hệ thống tự làm giàu dữ liệu, tiết kiệm tối đa credit API và tăng tốc độ truy vấn lần sau.
   */
  async saveExternalPlaces(places = [], db = prisma) {
    if (!Array.isArray(places) || places.length === 0) return [];
    const saved = [];
    for (const p of places) {
      if (!p.place_id || p.latitude == null || p.longitude == null) continue;
      try {
        const record = await db.restaurant.upsert({
          where: { place_id: p.place_id },
          update: {
            rating: p.rating ?? undefined,
            address: p.address || undefined,
          },
          create: {
            name: p.name,
            address: p.address,
            latitude: p.latitude,
            longitude: p.longitude,
            rating: p.rating ?? 4.5,
            image_url: p.image_url || null,
            diet_type_id: p.diet_type_id || 1, // Mặc định 1: Thuần Chay (Vegan)
            source: 'ziomap',
            status: 'APPROVED',
            place_id: p.place_id,
            details: {
              create: {
                city: p.city || (p.address?.includes('Hà Nội') ? 'Hà Nội' : 'Hồ Chí Minh'),
                hours: p.hours || 'Chưa cập nhật',
                price_range: 'Theo thời giá',
                separate_kitchen: true,
              },
            },
          },
        });
        saved.push(record);
      } catch (err) {
        console.warn(`[placeRepository] Bỏ qua lỗi lưu cache quán ${p.place_id}:`, err.message);
      }
    }
    return saved;
  },

  async findRestaurants(args = {}, db = prisma) {
    return db.restaurant.findMany(args);
  },

  async findById(restaurantId, db = prisma) {
    return db.restaurant.findUnique({
      where: { restaurant_id: Number(restaurantId) },
      include: {
        diet_type: true,
        details: true,
      },
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
