// D:/SWP391/SWP391/server/src/services/aiGenerationService.js
// Lưu lịch sử các lần sinh nội dung AI của người dùng đăng nhập (chat, thực đơn, quét món) và ghi log AI.
import { aiGenerationRepository } from '../repositories/aiGenerationRepository.js';
import { aiLogService } from './aiLogService.js';
import { aiGatewayError } from '../utils/aiGatewayError.js';

// Rút gọn bản ghi khi hiển thị danh sách.
function listRecord(record) {
  if (record.type !== 'FOOD_SCAN') return record;
  // Danh sách lịch sử quét không được gửi lại tới 10 MiB dữ liệu ảnh cho mỗi dòng.
  const requestPayload = { ...record.requestPayload };
  delete requestPayload.imageBase64;
  return { ...record, requestPayload };
}

export const aiGenerationService = {
  // Tạo bản ghi lịch sử khi bắt đầu gọi AI; khách (không đăng nhập) không lưu lịch sử nên trả null.
  async start(context) {
    if (!context.identity.userId) return null;
    const mapFeatureType = (feature) => {
      if (feature === 'chatbot') return 'CHAT';
      if (feature === 'mealPlanner') return 'MEAL_PLAN';
      return 'FOOD_SCAN';
    };
    const record = await aiGenerationRepository.create({
      userId: context.identity.userId, type: mapFeatureType(context.feature),
      modelName: 'ai-service', requestPayload: context.payload, promptMessages: [],
    });
    return record.id;
  },
  // Lưu prompt/trace mà AI Service trả về; luôn cập nhật context kể cả khi không có bản ghi để log vẫn có tên mô hình.
  async savePrompt(context, trace) {
    context.modelName = trace.modelName;
    context.promptMessages.push(trace);
    if (!context.generationId) return;
    await aiGenerationRepository.update({ id: context.generationId, data: {
      modelName: context.modelName, promptMessages: context.promptMessages,
    } });
  },
  // Đánh dấu hoàn tất và ghi log AI trong cùng transaction để lịch sử và log luôn khớp nhau.
  finish(context, log) {
    return aiGenerationRepository.runTransaction(async (tx) => {
      if (context.generationId) await aiGenerationRepository.update({ id: context.generationId, data: {
        status: 'COMPLETED', completedAt: new Date(), modelName: context.modelName,
        responsePayload: context.feature === 'chatbot' ? { reply: context.reply } : context.result.data,
      } }, tx);
      await aiLogService.recordLog(log, tx);
    });
  },
  // Đánh dấu thất bại kèm mã lỗi và ghi log AI trong cùng transaction.
  fail(context, error, log) {
    return aiGenerationRepository.runTransaction(async (tx) => {
      if (context.generationId) await aiGenerationRepository.update({ id: context.generationId, data: {
        status: 'FAILED', completedAt: new Date(), errorCode: error.errorCode || 'AI_PROVIDER_ERROR',
        errorMessage: error.message,
      } }, tx);
      await aiLogService.recordLog(log, tx);
    });
  },
  // Lấy một bản ghi lịch sử thuộc người dùng; không thấy thì 404.
  async getOwned(query) {
    const record = await aiGenerationRepository.findOwned(query);
    if (!record) throw aiGatewayError({ status: 404, code: 'AI_GENERATION_NOT_FOUND', message: 'Không tìm thấy lịch sử AI.' });
    return record;
  },
  // Liệt kê lịch sử của người dùng có phân trang.
  async listOwned(query) {
    const [data, total] = await Promise.all([aiGenerationRepository.findPage(query), aiGenerationRepository.count(query)]);
    return { data: data.map(listRecord), meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  },
};
