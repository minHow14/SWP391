// JavaScript source code
import prisma from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';

export const ingredientService = {
    /**
     * Get all liquid ingredient densities
     * Returns array of liquid densities with ingredient details
     */
    async getLiquidIngredientDensities() {
        try {
            const liquidDensities = await prisma.liquidIngredientDensity.findMany({
                include: {
                    ingredient: {
                        select: {
                            ingredient_id: true,
                            name: true,
                            calories_per_100g: true,
                            protein: true,
                            fat: true,
                            carbs: true,
                        },
                    },
                },
            });

            return liquidDensities.map((ld) => ({
                density_id: ld.density_id,
                ingredient_id: ld.ingredient_id,
                density: ld.density,
                ingredient: {
                    ingredient_id: ld.ingredient.ingredient_id,
                    name: ld.ingredient.name,
                    calories_per_100g: ld.ingredient.calories_per_100g,
                    protein: ld.ingredient.protein,
                    fat: ld.ingredient.fat,
                    carbs: ld.ingredient.carbs,
                },
            }));
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to fetch liquid ingredient densities', error.message);
        }
    },

    /**
     * Get liquid density by ingredient ID
     */
    async getLiquidDensityByIngredientId(ingredientId) {
        try {
            const liquidDensity = await prisma.liquidIngredientDensity.findUnique({
                where: { ingredient_id: parseInt(ingredientId) },
                include: {
                    ingredient: {
                        select: {
                            ingredient_id: true,
                            name: true,
                            calories_per_100g: true,
                            protein: true,
                            fat: true,
                            carbs: true,
                        },
                    },
                },
            });

            if (!liquidDensity) {
                return null;
            }

            return {
                density_id: liquidDensity.density_id,
                ingredient_id: liquidDensity.ingredient_id,
                density: liquidDensity.density,
                ingredient: liquidDensity.ingredient,
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to fetch liquid ingredient density', error.message);
        }
    },

    /**
     * Create a new liquid ingredient density (Admin only)
     */
    async createLiquidIngredientDensity(data) {
        try {
            const { ingredient_id, density } = data;

            // Verify ingredient exists
            const ingredient = await prisma.ingredient.findUnique({
                where: { ingredient_id: parseInt(ingredient_id) },
            });

            if (!ingredient) {
                throw new ApiError(404, 'Ingredient not found');
            }

            // Check if density already exists
            const existing = await prisma.liquidIngredientDensity.findUnique({
                where: { ingredient_id: parseInt(ingredient_id) },
            });

            if (existing) {
                throw new ApiError(409, 'Liquid density for this ingredient already exists');
            }

            const created = await prisma.liquidIngredientDensity.create({
                data: {
                    ingredient_id: parseInt(ingredient_id),
                    density: parseFloat(density),
                },
                include: {
                    ingredient: {
                        select: {
                            ingredient_id: true,
                            name: true,
                            calories_per_100g: true,
                            protein: true,
                            fat: true,
                            carbs: true,
                        },
                    },
                },
            });

            return {
                density_id: created.density_id,
                ingredient_id: created.ingredient_id,
                density: created.density,
                ingredient: created.ingredient,
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to create liquid ingredient density', error.message);
        }
    },

    /**
     * Update liquid ingredient density (Admin only)
     */
    async updateLiquidIngredientDensity(ingredientId, data) {
        try {
            const { density } = data;

            const updated = await prisma.liquidIngredientDensity.update({
                where: { ingredient_id: parseInt(ingredientId) },
                data: {
                    density: parseFloat(density),
                },
                include: {
                    ingredient: {
                        select: {
                            ingredient_id: true,
                            name: true,
                            calories_per_100g: true,
                            protein: true,
                            fat: true,
                            carbs: true,
                        },
                    },
                },
            });

            return {
                density_id: updated.density_id,
                ingredient_id: updated.ingredient_id,
                density: updated.density,
                ingredient: updated.ingredient,
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            if (error.code === 'P2025') {
                throw new ApiError(404, 'Liquid ingredient density not found');
            }
            throw new ApiError(500, 'Failed to update liquid ingredient density', error.message);
        }
    },

    /**
     * Delete liquid ingredient density (Admin only)
     */
    async deleteLiquidIngredientDensity(ingredientId) {
        try {
            await prisma.liquidIngredientDensity.delete({
                where: { ingredient_id: parseInt(ingredientId) },
            });

            return { message: 'Liquid ingredient density deleted successfully' };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            if (error.code === 'P2025') {
                throw new ApiError(404, 'Liquid ingredient density not found');
            }
            throw new ApiError(500, 'Failed to delete liquid ingredient density', error.message);
        }
    },
};