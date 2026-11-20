// d:/Projects/FPT/SWP391/server/src/repositories/place.repository.js
// Repository truy cập bảng nhà hàng/quán chay: tìm quanh vị trí, lưu cache dữ liệu từ nguồn ngoài (ZIOMAP) và cập nhật ảnh.
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { isVegetarianPlace } from '../utils/vegetarianFilter.js';

export const placeRepository = {
  /**
   * Cập nhật hàng loạt URL ảnh nhà hàng trong một câu SQL.
   * Chỉ ghi khi ảnh hiện tại vẫn bằng `previousImageUrl` (khóa lạc quan) để không ghi đè thay đổi xảy ra song song.
   */
  replaceImageUrls(records, db = prisma) {
    if (!records.length) return Promise.resolve([]);
    const rows = Prisma.join(records.map((record) => Prisma.sql`
      (${record.restaurantId}::integer, ${record.placeId}::text,
       ${record.previousImageUrl}::text, ${record.imageUrl}::text)`));
    return db.$queryRaw`
      UPDATE restaurants AS restaurant SET image_url = image.image_url, updated_at = NOW()
      FROM (VALUES ${rows}) AS image(restaurant_id, place_id, previous_image_url, image_url)
      WHERE restaurant.restaurant_id = image.restaurant_id AND restaurant.place_id = image.place_id
        AND restaurant.image_url IS NOT DISTINCT FROM image.previous_image_url
      RETURNING restaurant.restaurant_id`;
  },
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
      // Quy đổi bán kính km sang độ: 1 độ vĩ ≈ 111 km; độ kinh co lại theo cos(vĩ độ), chặn cos gần 0 (vùng cực) để tránh chia cho 0.
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

  /**
   * Cơ chế Cache-through (Read-through): Tự động lưu các quán chay thực tế lấy từ ZIOMAP vào PostgreSQL
   * Giúp hệ thống tự làm giàu dữ liệu, tiết kiệm tối đa credit API và tăng tốc độ truy vấn lần sau.
   */
  async saveExternalPlaces(places = [], db = prisma) {
    if (!Array.isArray(places) || places.length === 0) return [];
    const saved = [];
    for (const p of places) {
      // Chỉ lưu quán có place_id, tọa độ và được xác định là quán chay, tránh làm bẩn dữ liệu.
      if (!p.place_id || p.latitude == null || p.longitude == null || !isVegetarianPlace(p)) continue;
      try {
        const record = await db.restaurant.upsert({
          where: { place_id: p.place_id },
          update: {
            // Chỉ cập nhật các trường hay thay đổi; giữ nguyên tên và dữ liệu đã được chỉnh sửa trong hệ thống.
            rating: p.rating != null ? Number(p.rating) : undefined,
            address: p.address || undefined,
            image_url: p.image_url || undefined,
          },
          create: {
            name: p.name,
            address: p.address,
            latitude: p.latitude,
            longitude: p.longitude,
            rating: p.rating != null ? Number(p.rating) : null,
            image_url: p.image_url || null,
            diet_type_id: p.diet_type_id ? Number(p.diet_type_id) : null,
            source: 'ziomap',
            status: 'APPROVED',
            place_id: p.place_id,
            // Suy ra thành phố từ địa chỉ khi nguồn ngoài không cung cấp.
            city: p.city || (p.address?.includes('Hà Nội') ? 'Hà Nội' : p.address?.includes('Hồ Chí Minh') || p.address?.includes('TP.HCM') ? 'Hồ Chí Minh' : 'Chưa xác định'),
            hours: p.hours || 'Chưa cập nhật',
            priceRange: p.price_range || 'Theo thời giá',
            separateKitchen: p.separate_kitchen ?? null,
          },
        });
        saved.push(record);
      } catch (err) {
        // Lỗi lưu một quán không được làm hỏng cả lượt tìm kiếm, nên chỉ cảnh báo và bỏ qua.
        console.warn(`[placeRepository] Bỏ qua lỗi lưu cache quán ${p.place_id}:`, err.message);
      }
    }
    return saved;
  },

  // Lấy danh sách nhà hàng theo tham số Prisma.
  async findRestaurants(args = {}, db = prisma) {
    return db.restaurant.findMany(args);
  },

  // Tìm nhà hàng theo ID kèm chế độ ăn.
  async findById(restaurantId, db = prisma) {
    return db.restaurant.findUnique({
      where: { restaurant_id: Number(restaurantId) },
      include: {
        diet_type: true,
      },
    });
  },

  // Tạo nhà hàng mới.
  async create(data, db = prisma) {
    return db.restaurant.create({ data });
  },

  // Cập nhật nhà hàng theo ID.
  async update(restaurantId, data, db = prisma) {
    return db.restaurant.update({
      where: { restaurant_id: Number(restaurantId) },
      data,
    });
  },
};
