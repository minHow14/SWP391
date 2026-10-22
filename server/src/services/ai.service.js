// D:/SWP391/SWP391/server/src/services/ai.service.js
import { guestQuotaService } from './guestQuotaService.js';
import { clearAiChatCache } from './aiTransportService.js';
import { streamAiResponse } from './aiStreamService.js';

export const aiService = {
  async getUsage({ userId, guestId }) {
    if (userId) return {
      isAuthenticated: true, unlimited: true, dailyLimit: null, used: 0, remaining: null, resetsAt: null,
    };
    return { ...await guestQuotaService.getUsage({ guestId }), isAuthenticated: false, unlimited: false };
  },

  streamChat(options) {
    return streamAiResponse({ ...options, feature: 'chatbot', path: '/api/chat/stream' });
  },

  streamMealPlan(options) {
    return streamAiResponse({ ...options, feature: 'mealPlanner', path: '/api/meal-planner/generate/stream' });
  },

  clearChatbotCache: clearAiChatCache,
};
