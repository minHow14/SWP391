// server/src/services/ingredient.service.js
// Nghiệp vụ quản lý khối lượng riêng (density) của nguyên liệu lỏng, dùng để quy đổi thể tích sang khối lượng khi tính dinh dưỡng.
import prisma from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';

export const ingredientService = {
  /**
   * Lấy khối lượng riêng của tất cả nguyên liệu lỏng.
   * Trả về mảng gồm khối lượng riêng kèm thông tin nguyên liệu.
   */
  async getLiquidIngredientDensities() {
    try {
      const liquidIngredients = await prisma.ingredient.findMany({
        where: { density: { not: null } },
        select: {
          ingredient_id: true,
          name: true,
          calories_per_100g: true,
          protein: true,
          fat: true,
          carbs: true,
          density: true,
        },
      });

      // Giữ cấu trúc cũ (density_id) dù density nay lưu ngay trên bảng nguyên liệu, để FE không phải đổi.
      return liquidIngredients.map((item) => ({
        density_id: item.ingredient_id,
        ingredient_id: item.ingredient_id,
        density: item.density,
        ingredient: {
          ingredient_id: item.ingredient_id,
          name: item.name,
          calories_per_100g: item.calories_per_100g,
          protein: item.protein,
          fat: item.fat,
          carbs: item.carbs,
        },
      }));
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch liquid ingredient densities', error.message);
    }
  },

  /**
   * Lấy khối lượng riêng theo ID nguyên liệu (null nếu không phải nguyên liệu lỏng).
   */
  async getLiquidDensityByIngredientId(ingredientId) {
    try {
      const ingredient = await prisma.ingredient.findUnique({
        where: { ingredient_id: parseInt(ingredientId, 10) },
        select: {
          ingredient_id: true,
          name: true,
          calories_per_100g: true,
          protein: true,
          fat: true,
          carbs: true,
          density: true,
        },
      });

      if (!ingredient || ingredient.density == null) {
        return null;
      }

      return {
        density_id: ingredient.ingredient_id,
        ingredient_id: ingredient.ingredient_id,
        density: ingredient.density,
        ingredient: {
          ingredient_id: ingredient.ingredient_id,
          name: ingredient.name,
          calories_per_100g: ingredient.calories_per_100g,
          protein: ingredient.protein,
          fat: ingredient.fat,
          carbs: ingredient.carbs,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch liquid ingredient density', error.message);
    }
  },

  /**
   * Thêm khối lượng riêng cho nguyên liệu (chỉ Admin).
   */
  async createLiquidIngredientDensity(data) {
    try {
      const { ingredient_id, density } = data;
      const parsedId = parseInt(ingredient_id, 10);

      // Kiểm tra nguyên liệu tồn tại
      const ingredient = await prisma.ingredient.findUnique({
        where: { ingredient_id: parsedId },
      });

      if (!ingredient) {
        throw new ApiError(404, 'Ingredient not found');
      }

      // Kiểm tra nguyên liệu đã có khối lượng riêng chưa
      if (ingredient.density !== null && ingredient.density !== undefined) {
        throw new ApiError(409, 'Liquid density for this ingredient already exists');
      }

      const updated = await prisma.ingredient.update({
        where: { ingredient_id: parsedId },
        data: {
          density: parseFloat(density),
        },
        select: {
          ingredient_id: true,
          name: true,
          calories_per_100g: true,
          protein: true,
          fat: true,
          carbs: true,
          density: true,
        },
      });

      return {
        density_id: updated.ingredient_id,
        ingredient_id: updated.ingredient_id,
        density: updated.density,
        ingredient: {
          ingredient_id: updated.ingredient_id,
          name: updated.name,
          calories_per_100g: updated.calories_per_100g,
          protein: updated.protein,
          fat: updated.fat,
          carbs: updated.carbs,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to create liquid ingredient density', error.message);
    }
  },

  /**
   * Cập nhật khối lượng riêng của nguyên liệu lỏng (chỉ Admin).
   */
  async updateLiquidIngredientDensity(ingredientId, data) {
    try {
      const { density } = data;
      const parsedId = parseInt(ingredientId, 10);

      const ingredient = await prisma.ingredient.findUnique({
        where: { ingredient_id: parsedId },
      });

      if (!ingredient || ingredient.density == null) {
        throw new ApiError(404, 'Liquid ingredient density not found');
      }

      const updated = await prisma.ingredient.update({
        where: { ingredient_id: parsedId },
        data: {
          density: parseFloat(density),
        },
        select: {
          ingredient_id: true,
          name: true,
          calories_per_100g: true,
          protein: true,
          fat: true,
          carbs: true,
          density: true,
        },
      });

      return {
        density_id: updated.ingredient_id,
        ingredient_id: updated.ingredient_id,
        density: updated.density,
        ingredient: {
          ingredient_id: updated.ingredient_id,
          name: updated.name,
          calories_per_100g: updated.calories_per_100g,
          protein: updated.protein,
          fat: updated.fat,
          carbs: updated.carbs,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update liquid ingredient density', error.message);
    }
  },

  /**
   * Xóa khối lượng riêng của nguyên liệu (chỉ Admin).
   */
  async deleteLiquidIngredientDensity(ingredientId) {
    try {
      const parsedId = parseInt(ingredientId, 10);

      const ingredient = await prisma.ingredient.findUnique({
        where: { ingredient_id: parsedId },
      });

      if (!ingredient || ingredient.density == null) {
        throw new ApiError(404, 'Liquid ingredient density not found');
      }

      // "Xóa" chỉ đặt density về null vì đây là thuộc tính trên bảng nguyên liệu, không xóa nguyên liệu.
      await prisma.ingredient.update({
        where: { ingredient_id: parsedId },
        data: { density: null },
      });

      return { message: 'Liquid ingredient density deleted successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to delete liquid ingredient density', error.message);
    }
  },
};
