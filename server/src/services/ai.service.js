// d:\Projects\FPT\SWP391\server\src/services/ai.service.js
// Facade cho các tính năng AI (chatbot, lập thực đơn, quét món ăn, hạn mức) mà controller sử dụng.
import { guestQuotaService } from './guestQuotaService.js';
import { clearAiChatCache } from './aiTransportService.js';
import { streamAiResponse } from './aiStreamService.js';
import { analyzeFoodScan } from './aiFoodScanService.js';

export const aiService = {
  // Lấy thông tin hạn mức AI: người dùng đăng nhập không giới hạn, khách bị giới hạn theo ngày.
  async getUsage({ userId, guestId }) {
    if (userId) return {
      isAuthenticated: true, unlimited: true, dailyLimit: null, used: 0, remaining: null, resetsAt: null,
    };
    return { ...await guestQuotaService.getUsage({ guestId }), isAuthenticated: false, unlimited: false };
  },

  // Stream câu trả lời chatbot từ AI Service.
  streamChat(options) {
    return streamAiResponse({ ...options, feature: 'chatbot', path: '/api/chat/stream' });
  },

  // Stream kế hoạch bữa ăn do AI sinh ra.
  streamMealPlan(options) {
    return streamAiResponse({ ...options, feature: 'mealPlanner', path: '/api/meal-planner/generate/stream' });
  },

  // Phân tích ảnh món ăn bằng AI.
  analyzeFoodImage(options) {
    return analyzeFoodScan(options);
  },

  // Xóa cache hội thoại chatbot.
  clearChatbotCache: clearAiChatCache,
};
