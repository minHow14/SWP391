// d:\Projects\FPT\SWP391\client\src\services\apiClient.js
import axios from 'axios';
import { getSession, setSession } from '../lib/api.js';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Tự động đính kèm JWT Bearer Token
apiClient.interceptors.request.use(
  (config) => {
    const session = getSession();
    if (session?.token) {
      config.headers.Authorization = `Bearer ${session.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Chuẩn hóa dữ liệu trả về và xử lý mã lỗi
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    const responseData = error.response?.data;

    if (status === 401) {
      const session = getSession();
      if (session?.token) {
        setSession(null);
      }
    }

    const message =
      responseData?.message ||
      responseData?.error ||
      error.message ||
      'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
