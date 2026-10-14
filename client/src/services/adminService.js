// d:\Projects\FPT\SWP391\client\src\services\adminService.js
import apiClient from './apiClient.js';

export const adminService = {
  // FE-10: Dashboard tổng quan
  getDashboardStats: () => apiClient.get('/admin/dashboard/stats'),

  // FE-01: Quản lý thành viên
  getUsers: (params = {}) => apiClient.get('/admin/users', { params }),
  getUserContent: (userId) => apiClient.get(`/admin/users/${userId}/content`),
  updateUserStatus: (userId, status) => apiClient.patch(`/admin/users/${userId}/status`, { status }),
  deleteUser: (userId) => apiClient.delete(`/admin/users/${userId}`),

  // FE-02: Quản lý bài viết & video
  getPosts: (params = {}) => apiClient.get('/admin/posts', { params }),
  updatePostStatus: (postId, status) => apiClient.patch(`/admin/posts/${postId}/status`, { status }),
  updatePost: (postId, data) => apiClient.put(`/admin/posts/${postId}`, data),
  deletePost: (postId) => apiClient.delete(`/admin/posts/${postId}`),

  // FE-03: Quản lý bình luận
  getComments: (params = {}) => apiClient.get('/admin/comments', { params }),
  updateCommentStatus: (commentId, status) => apiClient.patch(`/admin/comments/${commentId}/status`, { status }),
  deleteComment: (commentId) => apiClient.delete(`/admin/comments/${commentId}`),

  // FE-04: Quản lý danh mục
  getCategories: () => apiClient.get('/admin/categories'),
  createCategory: (data) => apiClient.post('/admin/categories', data),
  updateCategory: (categoryId, data) => apiClient.put(`/admin/categories/${categoryId}`, data),
  deleteCategory: (categoryId) => apiClient.delete(`/admin/categories/${categoryId}`),

  // FE-05: Kiểm duyệt nội dung gắn cờ AI
  getAiFlaggedContent: () => apiClient.get('/admin/moderation/flagged'),
  resolveAiFlaggedItem: (data) => apiClient.post('/admin/moderation/resolve', data),

  // FE-06 & FE-07: Giám sát AI models, logs và metrics
  getAiModels: () => apiClient.get('/admin/ai/models'),
  getAiLogs: (params = {}) => apiClient.get('/admin/ai/logs', { params }),
  getAiMetrics: () => apiClient.get('/admin/ai/metrics'),

  // FE-08: Can thiệp thủ công AI
  interveneAi: (data) => apiClient.post('/admin/ai/intervene', data),

  // FE-09: Quản lý báo cáo vi phạm
  getReports: (params = {}) => apiClient.get('/admin/reports', { params }),
  updateReportStatus: (reportId, data) => apiClient.patch(`/admin/reports/${reportId}`, data),
};
