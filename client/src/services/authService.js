// D:/SWP391/SWP391/client/src/services/authService.js
import apiClient from './apiClient.js';
import { getSession, getSessionSnapshot, setSession } from '../utils/session.js';

let logoutFlight = null;
const passwordFlights = new Set();

async function waitForCookieMutations() {
  while (logoutFlight || passwordFlights.size) {
    await Promise.allSettled([logoutFlight, ...passwordFlights].filter(Boolean));
  }
}

async function authenticate(path, payload) {
  // Wait for the old cookie's clear response before a new login sets its replacement.
  await waitForCookieMutations();
  return apiClient.post(path, payload);
}

function logout() {
  if (logoutFlight) return logoutFlight;
  setSession(null);
  logoutFlight = Promise.allSettled([...passwordFlights]).then(() => apiClient.post('/auth/logout'))
    .finally(() => { logoutFlight = null; });
  return logoutFlight;
}

async function performPasswordChange({ currentPassword, newPassword, oldPassword }) {
  const snapshot = getSessionSnapshot();
  const ownerId = getSession()?.user?.user_id;
  const current = currentPassword || oldPassword;
  const result = await apiClient.post('/v1/auth/change-password', {
    currentPassword: current, oldPassword: current, newPassword,
  });
  const token = result?.data?.token;
  const session = getSession();
  if (token && session?.token && snapshot.identityRevision === getSessionSnapshot().identityRevision && ownerId === session.user?.user_id) {
    setSession({ ...session, token });
  }
  return result;
}

function changePassword(values) {
  const flight = performPasswordChange(values);
  passwordFlights.add(flight);
  const complete = () => passwordFlights.delete(flight);
  flight.then(complete, complete);
  return flight;
}

export const authService = {
  // Đăng nhập tài khoản
  login: (credentials) => authenticate('/auth/login', credentials),

  // Đăng ký tài khoản mới
  register: (data) => authenticate('/auth/register', data),

  logout,

  forgotPassword: ({ email }) => apiClient.post('/v1/auth/forgot-password', { email }),

  resetPassword: ({ token, newPassword }) => apiClient.post('/v1/auth/reset-password', { token, newPassword }),

  // Lấy thông tin tài khoản và hồ sơ người dùng hiện tại
  getMe: (config = {}) => apiClient.get('/auth/me', config),

  // Cập nhật thông tin tài khoản và hồ sơ sức khỏe
  updateMe: (data) => apiClient.patch('/auth/me', data),

  // Đổi mật khẩu tài khoản (hỗ trợ cả currentPassword và oldPassword)
  changePassword,

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
