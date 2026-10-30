// client/src/services/workspaceService.js
import apiClient from './apiClient.js';

export const workspaceService = {
  // Lấy toàn bộ danh mục món ăn, nguyên liệu, quán chay
  getCatalog: async (config = {}) => {
    const res = await apiClient.get('/workspace/catalog', config);
    return res?.data ?? res;
  },

  // Lấy nhật ký và kế hoạch ăn uống cá nhân
  getJournal: async (config = {}) => {
    const res = await apiClient.get('/workspace/journal', config);
    return res?.data ?? res;
  },

  // Cập nhật mục tiêu sức khỏe trong không gian nhật ký
  updateProfile: async (data) => {
    const res = await apiClient.patch('/workspace/profile', data);
    return res?.data ?? res;
  },

  // Thêm món ăn vào nhật ký
  addDiaryEntry: async (data) => {
    const res = await apiClient.post('/workspace/diary', data);
    return res?.data ?? res;
  },

  // Xóa món ăn khỏi nhật ký
  deleteDiaryEntry: async (diaryId) => {
    const res = await apiClient.delete(`/workspace/diary/${diaryId}`);
    return res?.data ?? res;
  },

  // Cập nhật kế hoạch thực đơn cá nhân
  setMealPlan: async (data) => {
    const res = await apiClient.put('/workspace/plan', data);
    return res?.data ?? res;
  },

  // Ghi nhận kế hoạch tuần vào nhật ký thực tế
  recordPlan: async (data) => {
    const res = await apiClient.post('/workspace/plan/record', data);
    return res?.data ?? res;
  },

  // Áp dụng thực đơn tuần do AI tạo vào kế hoạch tuần của nhật ký
  applyAiMealPlan: async (data) => {
    const res = await apiClient.post('/workspace/plan/apply-ai', data);
    return res?.data ?? res;
  },

  // Đề xuất quán chay mới
  suggestRestaurant: async (data) => {
    const res = await apiClient.post('/workspace/restaurants', data);
    return res?.data ?? res;
  },

  // Đánh giá quán chay
  reviewRestaurant: async (restaurantId, data) => {
    const res = await apiClient.post(`/workspace/restaurants/${restaurantId}/reviews`, data);
    return res?.data ?? res;
  },
};
