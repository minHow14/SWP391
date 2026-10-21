// d:\Projects\FPT\SWP391\server\src\repositories\place.repository.js
import prisma from '../config/prisma.js';

export const placeRepository = {
  async findNearbyCandidates(db = prisma) {
    return db.restaurant.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
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
