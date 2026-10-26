// client/src/services/authService.js
import apiClient from './apiClient.js';

export const authService = {
  // Đăng nhập tài khoản
  login: (credentials) => apiClient.post('/auth/login', credentials),

  // Đăng ký tài khoản mới
  register: (data) => apiClient.post('/auth/register', data),

  // Lấy thông tin tài khoản và hồ sơ người dùng hiện tại
  getMe: (config = {}) => apiClient.get('/auth/me', config),

  // Cập nhật thông tin tài khoản và hồ sơ sức khỏe
  updateMe: (data) => apiClient.patch('/auth/me', data),

  // Đổi mật khẩu tài khoản (hỗ trợ cả currentPassword và oldPassword)
  changePassword: ({ currentPassword, newPassword, oldPassword }) => {
    const current = currentPassword || oldPassword;
    return apiClient.post('/v1/auth/change-password', {
      currentPassword: current,
      oldPassword: current,
      newPassword,
    });
  },

  // Ghi nhận cân nặng mới và tự động tính toán lại BMI
  recordWeight: ({ weight, recordedAt, recorded_date }) =>
    apiClient.post('/v1/auth/me/weight', {
      weight,
      ...(recordedAt ? { recordedAt } : {}),
      ...(recorded_date ? { recorded_date } : {}),
    }),

  // Lấy lịch sử biến thiên cân nặng và chỉ số BMI
  getHealthHistory: (params = {}) =>
    apiClient.get('/v1/auth/me/health-history', { params }),
};
