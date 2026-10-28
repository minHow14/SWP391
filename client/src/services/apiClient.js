// client/src/services/apiClient.js
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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const responseData = error.response?.data;

    if (axios.isCancel(error)) return Promise.reject(error);

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

    const buildNormalizedError = (err = error) => {
      const respData = err.response?.data || responseData;
      const respStatus = err.response?.status || status;
      return Object.assign(new Error(message, { cause: err }), {
        status: respStatus,
        code: respData?.errorCode || err.code || 'NETWORK_ERROR',
        errorCode: respData?.errorCode,
        requestId: respData?.meta?.requestId,
        details: respData?.errors,
      });
    };

    if (status === 401 && originalRequest) {
      const session = getSession();
      const authorization = originalRequest.headers?.Authorization;
      const isCurrentSession = Boolean(session?.token && authorization === `Bearer ${session.token}`);

      // Chỉ xử lý refresh nếu là 401 của phiên hiện tại và chưa từng retry
      if (isCurrentSession && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((newToken) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return apiClient(originalRequest);
            })
            .catch((queueErr) => Promise.reject(buildNormalizedError(queueErr)));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshResponse = await axios.post(
            '/api/v1/auth/refresh',
            {},
            { withCredentials: true }
          );

          const newToken =
            refreshResponse.data?.data?.accessToken ||
            refreshResponse.data?.data?.token ||
            refreshResponse.data?.accessToken ||
            refreshResponse.data?.token;

          if (!newToken) {
            throw new Error('Refresh token không trả về access token mới');
          }

          const currentSession = getSession();
          if (currentSession) {
            setSession({ ...currentSession, token: newToken });
          }

          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          const currentSession = getSession();
          if (currentSession?.token && authorization === `Bearer ${currentSession.token}`) {
            setSession(null);
          }
          return Promise.reject(buildNormalizedError(refreshErr));
        } finally {
          isRefreshing = false;
        }
      } else if (isCurrentSession && originalRequest._retry) {
        setSession(null);
      }
    }

    return Promise.reject(buildNormalizedError(error));
  }
);

export default apiClient;
