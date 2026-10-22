// D:/SWP391/SWP391/server/src/services/aiGenerationService.js
import { aiGenerationRepository } from '../repositories/aiGenerationRepository.js';
import { aiLogService } from './aiLogService.js';
import { aiGatewayError } from '../utils/aiGatewayError.js';

export const aiGenerationService = {
  async start(context) {
    if (!context.identity.userId) return null;
    const record = await aiGenerationRepository.create({
      userId: context.identity.userId, type: context.feature === 'chatbot' ? 'CHAT' : 'MEAL_PLAN',
      modelName: 'ai-service', requestPayload: context.payload, promptMessages: [],
    });
    return record.id;
  },
  async savePrompt(context, trace) {
    context.modelName = trace.modelName;
    context.promptMessages.push(trace);
    if (!context.generationId) return;
    await aiGenerationRepository.update({ id: context.generationId, data: {
      modelName: context.modelName, promptMessages: context.promptMessages,
    } });
  },
  finish(context, log) {
    return aiGenerationRepository.runTransaction(async (tx) => {
      if (context.generationId) await aiGenerationRepository.update({ id: context.generationId, data: {
        status: 'COMPLETED', completedAt: new Date(), modelName: context.modelName,
        responsePayload: context.feature === 'chatbot' ? { reply: context.reply } : context.result.data,
      } }, tx);
      await aiLogService.recordLog(log, tx);
    });
  },
  fail(context, error, log) {
    return aiGenerationRepository.runTransaction(async (tx) => {
      if (context.generationId) await aiGenerationRepository.update({ id: context.generationId, data: {
        status: 'FAILED', completedAt: new Date(), errorCode: error.errorCode || 'AI_PROVIDER_ERROR',
        errorMessage: error.message,
      } }, tx);
      await aiLogService.recordLog(log, tx);
    });
  },
  async getOwned(query) {
    const record = await aiGenerationRepository.findOwned(query);
    if (!record) throw aiGatewayError({ status: 404, code: 'AI_GENERATION_NOT_FOUND', message: 'Không tìm thấy lịch sử AI.' });
    return record;
  },
  async listOwned(query) {
    const [data, total] = await Promise.all([aiGenerationRepository.findPage(query), aiGenerationRepository.count(query)]);
    return { data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  },
};
