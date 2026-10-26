// D:/SWP391/SWP391/client/src/services/apiClient.js
import axios from 'axios';
import { getSession, setSession } from '../utils/session.js';

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

    if (axios.isCancel(error)) return Promise.reject(error);
    if (status === 401) {
      const session = getSession();
      const authorization = error.config?.headers?.Authorization;
      if (session?.token && authorization === `Bearer ${session.token}`) {
        setSession(null);
      }
    }

    const firstDetail =
      Array.isArray(responseData?.errors) && responseData.errors[0]?.message
        ? responseData.errors[0].message
        : null;

    const message =
      firstDetail ||
      responseData?.message ||
      responseData?.error ||
      error.message ||
      'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';

    const normalized = Object.assign(new Error(message, { cause: error }), {
      status, code: responseData?.errorCode || error.code || 'NETWORK_ERROR',
      errorCode: responseData?.errorCode, requestId: responseData?.meta?.requestId,
      details: responseData?.errors,
    });
    return Promise.reject(normalized);
  }
);

export default apiClient;
