// d:/Projects/FPT/SWP391/server/src/services/ingredientRecognition.service.js
import fs from 'node:fs';
import path from 'node:path';
import { aiConfig } from '../config/aiConfig.js';
import { AI_LOG_FEATURE, AI_LOG_STATUS } from '../constants/aiLogs.js';
import { FRESHNESS_STATUS, SCAN_STATUS } from '../constants/status.js';
import { ingredientRecognitionRepository } from '../repositories/ingredientRecognition.repository.js';
import { aiLogService } from './aiLogService.js';
import { guestQuotaService } from './guestQuotaService.js';
import { ApiError } from '../utils/apiError.js';

function stripVietnameseDiacritics(str = '') {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function resolveIngredientMatch(detectedName, catalog = []) {
  const normalizedDetected = stripVietnameseDiacritics(detectedName);

  for (const item of catalog) {
    const normalizedName = stripVietnameseDiacritics(item.name);
    if (normalizedDetected === normalizedName || normalizedDetected.includes(normalizedName) || normalizedName.includes(normalizedDetected)) {
      return item;
    }

    const aliases = (item.details?.aliases || '')
      .split(',')
      .map((a) => stripVietnameseDiacritics(a))
      .filter(Boolean);

    if (aliases.some((alias) => normalizedDetected === alias || normalizedDetected.includes(alias))) {
      return item;
    }
  }

  return null;
}

function classifyTier(matchPercentage) {
  if (matchPercentage >= 100) return 'READY_TO_COOK';
  if (matchPercentage >= 60) return 'MISSING_FEW';
  return 'INSPIRATION';
}

export const ingredientRecognitionService = {
  async recognize({ file, options = {}, identity = {}, requestId }) {
    if (!file) {
      throw ApiError.badRequest('Vui lòng cung cấp tệp ảnh nguyên liệu hoặc tủ lạnh.');
    }

    const relativeImageUrl = `/uploads/recognition/${file.filename}`;
    let reservation = null;

    if (!identity.userId) {
      reservation = await guestQuotaService.reserveTurn({ guestId: identity.guestId });
    }

    const scan = await ingredientRecognitionRepository.createScan({
      userId: identity.userId ?? null,
      imageUrl: relativeImageUrl,
      status: SCAN_STATUS.PROCESSING,
    });

    let aiResult;
    try {
      aiResult = await this.callAiVisionService({
        filePath: file.path,
        fileName: file.filename,
        mimeType: file.mimetype,
        identity,
        requestId,
      });
    } catch (error) {
      if (reservation) {
        await guestQuotaService.releaseTurn(reservation).catch(() => {});
      }

      await ingredientRecognitionRepository.updateScan(scan.id, {
        status: SCAN_STATUS.FAILED,
        errorCode: error.errorCode || 'AI_VISION_FAILED',
        errorMessage: error.message || 'Lỗi xử lý thị giác máy tính từ AI Service.',
      });

      await aiLogService.recordLog({
        modelName: 'computer-vision',
        action: `RECOGNIZE_INGREDIENTS_${identity.userId ? `USER_${identity.userId}` : 'GUEST'}`,
        status: AI_LOG_STATUS.ERROR,
        errorFeedback: error.message,
      });

      throw ApiError.internal('Dịch vụ nhận diện AI hiện không khả dụng. Vui lòng thử lại sau.');
    }

    const catalog = await ingredientRecognitionRepository.fetchIngredientCatalog();
    const minConfidence = options.minConfidence ?? 0.5;

    const rawItems = (aiResult.items || []).filter((item) => Number(item.confidence) >= minConfidence);

    const mappedItems = rawItems.map((item) => {
      const matched = resolveIngredientMatch(item.detectedName, catalog);
      return {
        scanId: scan.id,
        ingredientId: matched?.ingredient_id ?? null,
        detectedName: item.detectedName,
        confidence: item.confidence,
        quantityEstimate: item.quantityEstimate || null,
        freshnessStatus: item.freshnessStatus || FRESHNESS_STATUS.GOOD,
        freshnessScore: Number(item.freshnessScore) || 80,
        estimatedShelfLifeDays: item.estimatedShelfLifeDays ?? null,
        spoilageSigns: item.spoilageSigns || [],
        storageAdvice: item.storageAdvice || null,
        boundingBox: item.boundingBox || null,
        matchedCatalogName: matched?.name ?? null,
      };
    });

    const recognizedIngredientIds = mappedItems
      .map((item) => item.ingredientId)
      .filter((id) => id !== null);

    const expiringIngredientIds = new Set(
      mappedItems
        .filter((item) => item.freshnessStatus === FRESHNESS_STATUS.EXPIRING_SOON)
        .map((item) => item.ingredientId)
        .filter(Boolean)
    );

    const matchingRecipes = await this.findMatchingRecipes({
      ingredientIds: recognizedIngredientIds,
      expiringIngredientIds,
      userId: identity.userId,
      dietTypeId: options.dietTypeId,
      maxPrepTime: options.maxPrepTime,
    });

    const summary = aiResult.summary || `Đã nhận diện ${mappedItems.length} nguyên liệu trong ảnh.`;

    await ingredientRecognitionRepository.runTransaction(async (tx) => {
      if (mappedItems.length > 0) {
        const dbItems = mappedItems.map(({ matchedCatalogName, ...dbFields }) => dbFields);
        await ingredientRecognitionRepository.createRecognizedItems(dbItems, tx);
      }

      await ingredientRecognitionRepository.updateScan(
        scan.id,
        {
          status: SCAN_STATUS.COMPLETED,
          summary,
        },
        tx
      );

      await aiLogService.recordLog(
        {
          modelName: 'computer-vision',
          action: `RECOGNIZE_INGREDIENTS_${identity.userId ? `USER_${identity.userId}` : 'GUEST'}`,
          status: AI_LOG_STATUS.SUCCESS,
        },
        tx
      );
    });

    return {
      scanId: scan.id,
      imageUrl: relativeImageUrl,
      summary,
      recognizedItems: mappedItems,
      matchingRecipes,
      remainingQuota: reservation?.remaining ?? null,
    };
  },

  async callAiVisionService({ filePath, fileName, mimeType, identity, requestId }) {
    if (!aiConfig.internalApiKey) {
      throw new Error('Dịch vụ AI chưa được cấu hình khóa nội bộ.');
    }

    const fileBuffer = await fs.promises.readFile(filePath);
    const formData = new FormData();
    formData.append('image', new Blob([fileBuffer], { type: mimeType }), fileName);

    const response = await fetch(`${aiConfig.url}/api/vision/recognize-ingredients`, {
      method: 'POST',
      signal: AbortSignal.timeout(aiConfig.timeoutMs),
      headers: {
        'X-Internal-Api-Key': aiConfig.internalApiKey,
        ...(requestId ? { 'X-Request-Id': requestId } : {}),
        ...(identity.userId ? { 'X-User-Id': String(identity.userId) } : { 'X-Guest-Id': identity.guestId || '' }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`AI Microservice phản hồi lỗi HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.message || 'Dữ liệu nhận diện không hợp lệ từ AI Microservice.');
    }

    return result.data;
  },

  async findMatchingRecipes({ ingredientIds, expiringIngredientIds, userId, dietTypeId, maxPrepTime }) {
    if (ingredientIds.length === 0) return [];

    let excludedIngredientIds = [];
    if (userId) {
      const allergies = await ingredientRecognitionRepository.findUserAllergies(userId);
      excludedIngredientIds = allergies.map((a) => a.ingredient_id);
    }

    const recipes = await ingredientRecognitionRepository.findCandidateRecipes({
      ingredientIds,
      dietTypeId,
      excludedIngredientIds,
    });

    const recognizedSet = new Set(ingredientIds);

    const evaluated = recipes
      .map((recipe) => {
        const ingredients = recipe.recipe_ingredients || [];
        const total = ingredients.length;
        if (total === 0) return null;

        const matched = ingredients.filter((ri) => recognizedSet.has(ri.ingredient_id));
        const matchedCount = matched.length;
        const matchPercentage = Math.round((matchedCount / total) * 100);

        if (matchPercentage < 30) return null;
        if (maxPrepTime && recipe.prep_time && recipe.prep_time > maxPrepTime) return null;

        const missing = ingredients
          .filter((ri) => !recognizedSet.has(ri.ingredient_id))
          .map((ri) => ({
            name: ri.ingredient?.name || 'Nguyên liệu phụ',
            quantity: ri.quantity,
            unit: ri.unit,
          }));

        const hasExpiring = ingredients.some((ri) => expiringIngredientIds.has(ri.ingredient_id));
        const priorityScore = matchPercentage + (hasExpiring ? 30 : 0);

        return {
          recipeId: recipe.recipe_id,
          recipeName: recipe.recipe_name,
          imageUrl: recipe.image_url,
          prepTime: recipe.prep_time,
          totalCalories: recipe.total_calories,
          matchPercentage,
          priorityScore,
          tier: classifyTier(matchPercentage),
          hasExpiringIngredients: hasExpiring,
          matchedIngredients: matched.map((ri) => ri.ingredient?.name).filter(Boolean),
          missingIngredients: missing,
        };
      })
      .filter(Boolean);

    return evaluated.sort((a, b) => b.priorityScore - a.priorityScore || b.matchPercentage - a.matchPercentage || (a.prepTime || 0) - (b.prepTime || 0));
  },

  async getScanDetail(id, userId) {
    const scan = await ingredientRecognitionRepository.findScanById(id, { userId });
    if (!scan) {
      throw ApiError.notFound('Không tìm thấy bản ghi nhận diện nguyên liệu.');
    }

    const ingredientIds = scan.items.map((i) => i.ingredientId).filter(Boolean);
    const expiringIngredientIds = new Set(
      scan.items
        .filter((i) => i.freshnessStatus === FRESHNESS_STATUS.EXPIRING_SOON)
        .map((i) => i.ingredientId)
        .filter(Boolean)
    );

    const matchingRecipes = await this.findMatchingRecipes({
      ingredientIds,
      expiringIngredientIds,
      userId,
    });

    return {
      ...scan,
      matchingRecipes,
    };
  },

  async getScanHistory(userId, { page = 1, limit = 10 }) {
    const [items, total] = await Promise.all([
      ingredientRecognitionRepository.findScansByUser({ userId, page, limit }),
      ingredientRecognitionRepository.countScansByUser(userId),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async deleteScan(id, userId) {
    const result = await ingredientRecognitionRepository.softDeleteScan(id, userId);
    if (result.count === 0) {
      throw ApiError.notFound('Không tìm thấy bản ghi hoặc bạn không có quyền xóa bản ghi này.');
    }
    return true;
  },
};
