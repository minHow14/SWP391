// server/src/services/aiFoodScanService.js
import { aiConfig } from '../config/aiConfig.js';
import { aiGatewayError, normalizeAiError } from '../utils/aiGatewayError.js';
import { aiGenerationService } from './aiGenerationService.js';
import { guestQuotaService } from './guestQuotaService.js';
import { assertAiConfigured, sendAiJson } from './aiTransportService.js';

function createLogPayload(context, status, error) {
  const actor = context.identity.userId ? `USER_${context.identity.userId}` : 'GUEST';
  return {
    modelName: context.modelName || 'ai-service',
    action: `FOOD_SCAN_${actor}`,
    status,
    errorFeedback: error ? error.errorCode || 'AI_PROVIDER_ERROR' : null,
  };
}

export async function analyzeFoodScan({ payload, identity, requestId }) {
  assertAiConfigured();

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(aiGatewayError({
      status: 504,
      code: 'AI_TIMEOUT',
      message: 'Dịch vụ AI xử lý hình ảnh quá thời gian cho phép.',
    }));
  }, aiConfig.timeoutMs);

  const context = {
    feature: 'foodScanner',
    identity,
    payload,
    requestId,
    modelName: 'ai-service',
    signal: controller.signal,
    result: null,
    generationId: null,
    reservation: null,
  };

  try {
    if (!identity.userId) {
      context.reservation = await guestQuotaService.reserveTurn({ guestId: identity.guestId });
    }

    context.generationId = await aiGenerationService.start(context);
    context.signal.throwIfAborted();

    const response = await sendAiJson({
      path: '/api/food-scanner/analyze',
      payload,
      signal: context.signal,
      requestId,
      identity,
    });

    if (!response || response.success === false || !response.data) {
      throw aiGatewayError({
        status: 502,
        code: 'AI_PROVIDER_ERROR',
        message: response?.message || 'Không thể phân tích hình ảnh món ăn từ AI Microservice.',
      });
    }

    context.result = response;
    context.modelName = response.meta?.modelName || 'ai-service';

    await aiGenerationService.finish(context, createLogPayload(context, 'SUCCESS'));

    return {
      success: true,
      message: response.message || 'Phân tích món ăn thành công.',
      data: response.data,
      meta: {
        ...(response.meta || {}),
        requestId,
        generationId: context.generationId,
        remaining: context.reservation?.remaining ?? null,
      },
    };
  } catch (rawError) {
    const error = normalizeAiError(rawError, context.signal);
    try {
      if (context.reservation) {
        await guestQuotaService.releaseTurn(context.reservation);
      }
      await aiGenerationService.fail(context, error, createLogPayload(context, 'ERROR', error));
    } catch {
      // Giữ nguyên lỗi gốc để gửi về cho client
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
