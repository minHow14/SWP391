// client/src/services/searchService.js
// Dịch vụ tìm kiếm toàn cục nội dung (video, blog) và gợi ý theo từ khóa.
import apiClient from './apiClient.js';

export const searchService = {
  /**
   * Tìm kiếm toàn diện Video và Blogs trên toàn hệ thống
   * @param {object} params
   * @param {string} params.q - Từ khóa tìm kiếm
   * @param {'ALL' | 'BLOG' | 'VIDEO'} [params.type='ALL'] - Phân loại nội dung
   * @param {number} [params.page=1] - Số trang
   * @param {number} [params.limit=20] - Giới hạn số lượng
   * @param {number} [params.categoryId] - Mã chuyên mục
   * @param {object} [config] - Cấu hình Axios bổ sung (signal, timeout)
   */
  async searchPosts({ q, type = 'ALL', page = 1, limit = 20, categoryId } = {}, config = {}) {
    const params = { q: q ? String(q).trim() : '' };
    if (type) params.type = type;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    if (categoryId) params.categoryId = categoryId;

    const response = await apiClient.get('/v1/search', {
      params,
      ...config,
    });
    return response?.data ?? response;
  },

  /**
   * Đề xuất Video và Quán ăn dựa trên từ khóa gợi ý
   * @param {string} keyword - Từ khóa gợi ý
   * @param {object} [config] - Cấu hình Axios bổ sung
   */
  async suggestByKeyword(keyword, config = {}) {
    const response = await apiClient.get('/v1/recommendations', {
      params: { keyword: keyword ? String(keyword).trim() : '' },
      ...config,
    });
    return response?.data ?? response;
  },
};
