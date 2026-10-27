// client/src/services/ingredientRecognitionService.js
import apiClient from './apiClient.js';

export const ingredientRecognitionService = {
  /**
   * Gửi ảnh chụp nguyên liệu/tủ lạnh lên server để nhận diện qua Computer Vision
   * @param {FormData} formData
   */
  async recognize(formData) {
    const response = await apiClient.post('/v1/ingredient-recognition/recognize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Lấy lịch sử quét của tài khoản người dùng
   * @param {{ page?: number, limit?: number }} params
   */
  async getHistory({ page = 1, limit = 10 } = {}) {
    const response = await apiClient.get('/v1/ingredient-recognition/history', {
      params: { page, limit },
    });
    return response;
  },

  /**
   * Xem chi tiết kết quả một phiên quét trong quá khứ
   * @param {string} scanId
   */
  async getScanById(scanId) {
    const response = await apiClient.get(`/v1/ingredient-recognition/history/${scanId}`);
    return response.data;
  },

  /**
   * Xóa mềm một bản ghi quét
   * @param {string} scanId
   */
  async deleteScan(scanId) {
    const response = await apiClient.delete(`/v1/ingredient-recognition/history/${scanId}`);
    return response;
  },
};
