// D:/SWP391/SWP391/client/src/services/authService.js
import apiClient from './apiClient.js';
import { getSession, getSessionSnapshot, setSession } from '../utils/session.js';

let logoutFlight = null;

async function authenticate(path, payload) {
  // Wait for the old cookie's clear response before a new login sets its replacement.
  if (logoutFlight) await logoutFlight.catch(() => undefined);
  return apiClient.post(path, payload);
}

function logout() {
  if (logoutFlight) return logoutFlight;
  setSession(null);
  logoutFlight = apiClient.post('/auth/logout').finally(() => { logoutFlight = null; });
  return logoutFlight;
}

export const authService = {
  // Đăng nhập tài khoản
  login: (credentials) => authenticate('/auth/login', credentials),

  // Đăng ký tài khoản mới
  register: (data) => authenticate('/auth/register', data),

  logout,

  // Lấy thông tin tài khoản và hồ sơ người dùng hiện tại
  getMe: (config = {}) => apiClient.get('/auth/me', config),

  // Cập nhật thông tin tài khoản và hồ sơ sức khỏe
  updateMe: (data) => apiClient.patch('/auth/me', data),

  // Đổi mật khẩu tài khoản (hỗ trợ cả currentPassword và oldPassword)
  changePassword: async ({ currentPassword, newPassword, oldPassword }) => {
    const snapshot = getSessionSnapshot();
    const ownerId = getSession()?.user?.user_id;
    const current = currentPassword || oldPassword;
    const result = await apiClient.post('/v1/auth/change-password', {
      currentPassword: current,
      oldPassword: current,
      newPassword,
    });
    const token = result?.data?.token;
    const session = getSession();
    if (token && session?.token && snapshot.identityRevision === getSessionSnapshot().identityRevision && ownerId === session.user?.user_id) {
      setSession({ ...session, token });
    }
    return result;
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
