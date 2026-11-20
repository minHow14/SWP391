// D:/SWP391/SWP391/client/src/services/authService.js
// Dịch vụ xác thực: đăng nhập, đăng ký, đăng xuất, khôi phục mật khẩu, hồ sơ và chỉ số sức khỏe.
import apiClient from './apiClient.js';
import { getSession, getSessionSnapshot, setSession } from '../utils/session.js';

// Theo dõi các request đang thay đổi cookie phiên (đăng xuất, đổi mật khẩu) để tuần tự hóa chúng.
let logoutFlight = null;
const passwordFlights = new Set();

// Chờ cho tới khi không còn request nào đang thay đổi cookie phiên.
async function waitForCookieMutations() {
  while (logoutFlight || passwordFlights.size) {
    await Promise.allSettled([logoutFlight, ...passwordFlights].filter(Boolean));
  }
}

// Đăng nhập/đăng ký sau khi các thao tác cookie trước đó đã xong.
async function authenticate(path, payload) {
  // Chờ response xóa cookie cũ hoàn tất trước khi lần đăng nhập mới đặt cookie thay thế.
  await waitForCookieMutations();
  return apiClient.post(path, payload);
}

// Xóa phiên trên trình duyệt ngay rồi mới gọi server; gộp các lần bấm đăng xuất liên tiếp thành một request.
function logout() {
  if (logoutFlight) return logoutFlight;
  setSession(null);
  logoutFlight = Promise.allSettled([...passwordFlights]).then(() => apiClient.post('/auth/logout'))
    .finally(() => { logoutFlight = null; });
  return logoutFlight;
}

// Đổi mật khẩu; chỉ lưu token mới nếu phiên vẫn thuộc cùng tài khoản và danh tính chưa đổi.
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

// Bọc đổi mật khẩu để theo dõi request đang chạy (đăng xuất phải chờ nó xong).
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

  // Đăng xuất
  logout,

  // Gửi mã OTP khôi phục mật khẩu tới email
  forgotPassword: ({ email }) => apiClient.post('/v1/auth/forgot-password', { email }),

  // Xác minh mã OTP khôi phục mật khẩu
  verifyPasswordResetOtp: ({ email, otp }) => apiClient.post('/v1/auth/verify-password-reset-otp', { email, otp }),

  // Đặt mật khẩu mới bằng token khôi phục
  resetPassword: ({ token, newPassword }) => apiClient.post('/v1/auth/reset-password', { token, newPassword }),

  // Lấy thông tin tài khoản và hồ sơ người dùng hiện tại
  getMe: (config = {}) => apiClient.get('/auth/me', config),

  // Cập nhật thông tin tài khoản và hồ sơ sức khỏe
  updateMe: (data) => apiClient.patch('/auth/me', data),

  // Đổi mật khẩu tài khoản (hỗ trợ cả currentPassword và oldPassword)
  changePassword,

  // Ghi nhận cân nặng mới và tự động tính toán lại BMI
  recordWeight: ({ weight, recordedDate, recordedAt, recorded_date }) => {
    const timestamp = recordedDate || recordedAt || recorded_date;
    return apiClient.post('/v1/auth/me/weight', { weight, ...(timestamp ? { recordedDate: timestamp } : {}) });
  },

  // Lấy lịch sử biến thiên cân nặng và chỉ số BMI
  getHealthHistory: (params = {}) =>
    apiClient.get('/v1/auth/me/health-history', { params }),
};
