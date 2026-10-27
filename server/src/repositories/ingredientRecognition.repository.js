// d:/Projects/FPT/SWP391/server/src/repositories/ingredientRecognition.repository.js
import prisma from '../config/prisma.js';

const scanSelect = Object.freeze({
  id: true,
  userId: true,
  imageUrl: true,
  status: true,
  summary: true,
  errorCode: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      ingredientId: true,
      detectedName: true,
      confidence: true,
      quantityEstimate: true,
      freshnessStatus: true,
      freshnessScore: true,
      estimatedShelfLifeDays: true,
      spoilageSigns: true,
      storageAdvice: true,
      boundingBox: true,
      createdAt: true,
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
    orderBy: { createdAt: 'asc' },
  },
});

export const ingredientRecognitionRepository = {
  createScan(data, db = prisma) {
    return db.ingredientScan.create({
      data,
      select: scanSelect,
    });
  },

  updateScan(id, data, db = prisma) {
    return db.ingredientScan.update({
      where: { id },
      data,
      select: scanSelect,
    });
  },

  createRecognizedItems(items, db = prisma) {
    return db.recognizedIngredientItem.createMany({
      data: items,
    });
  },

  findScanById(id, { userId } = {}, db = prisma) {
    return db.ingredientScan.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {}),
        deletedAt: null,
      },
      select: scanSelect,
    });
  },

  findScansByUser({ userId, page = 1, limit = 10 }, db = prisma) {
    const skip = (page - 1) * limit;
    return db.ingredientScan.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        imageUrl: true,
        status: true,
        summary: true,
        createdAt: true,
        _count: {
          select: { items: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit,
    });
  },

  countScansByUser(userId, db = prisma) {
    return db.ingredientScan.count({
      where: {
        userId,
        deletedAt: null,
      },
    });
  },

  softDeleteScan(id, userId, db = prisma) {
    return db.ingredientScan.updateMany({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  },

  fetchIngredientCatalog(db = prisma) {
    return db.ingredient.findMany({
      select: {
        ingredient_id: true,
        name: true,
        details: {
          select: {
            aliases: true,
            category: true,
          },
        },
      },
    });
  },

  findUserAllergies(userId, db = prisma) {
    return db.userAllergy.findMany({
      where: { user_id: userId },
      select: { ingredient_id: true },
    });
  },

  findCandidateRecipes({ ingredientIds, dietTypeId, excludedIngredientIds = [] }, db = prisma) {
    return db.recipe.findMany({
      where: {
        ...(dietTypeId ? { diet_type_id: dietTypeId } : {}),
        recipe_ingredients: {
          some: {
            ingredient_id: { in: ingredientIds },
          },
          ...(excludedIngredientIds.length > 0
            ? {
                none: {
                  ingredient_id: { in: excludedIngredientIds },
                },
              }
            : {}),
        },
      },
      select: {
        recipe_id: true,
        recipe_name: true,
        image_url: true,
        prep_time: true,
        total_calories: true,
        instructions: true,
        recipe_ingredients: {
          select: {
            ingredient_id: true,
            quantity: true,
            unit: true,
            ingredient: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      take: 50,
    });
  },

  runTransaction(action) {
    return prisma.$transaction(action);
  },
};
