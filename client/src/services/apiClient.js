// D:/SWP391/SWP391/client/src/services/apiClient.js
// Axios client dùng chung cho mọi API Back-end: gắn token, tự làm mới phiên khi 401 và chuẩn hóa lỗi.
import axios from 'axios';
import { getSession, getSessionSnapshot, setSession } from '../utils/session.js';
const apiClient = axios.create({
  baseURL: '/api', timeout: 15000, withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
// Các request xác thực không được kích hoạt làm mới token để tránh vòng lặp vô hạn.
const isAuthHandshake = (url = '') => /(?:^|\/)auth\/(login|register|refresh|logout)\/?$/.test(url);
// refreshFlight gom các yêu cầu làm mới đồng thời thành một; lastRefresh nhớ lần làm mới gần nhất
// để request đến muộn biết phiên đã được làm mới thay vì bị coi là phiên khác.
let refreshFlight = null;
let lastRefresh = null;
// Chuẩn hóa lỗi Axios thành Error có message tiếng Việt, status, mã lỗi, requestId và chi tiết lỗi.
function normalizeApiError(error) {
  const data = error.response?.data;
  const firstDetail = Array.isArray(data?.errors) ? data.errors[0]?.message : null;
  const message = firstDetail || data?.message || data?.error?.message ||
    (typeof data?.error === 'string' ? data.error : null) || error.message ||
    'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';
  return Object.assign(new Error(message, { cause: error }), {
    status: error.response?.status, code: data?.errorCode || error.code || 'NETWORK_ERROR',
    errorCode: data?.errorCode, requestId: data?.meta?.requestId, details: data?.errors,
  });
}
// Gọi /auth/refresh để lấy access token mới; bỏ qua kết quả nếu phiên đã đổi trong lúc chờ,
// và xóa phiên nếu refresh token thuộc tài khoản khác (đăng nhập tài khoản khác ở tab khác).
async function performRefresh(snapshot) {
  try {
    const result = await apiClient.post('/auth/refresh', undefined, { skipAuthRefresh: true });
    if (getSessionSnapshot().revision !== snapshot.revision) return null;
    const token = result?.data?.token || result?.data?.accessToken || result?.token || result?.accessToken;
    if (!result?.success || !token) throw new Error('Phản hồi làm mới phiên đăng nhập không hợp lệ.');
    if (!snapshot.userId || result.data?.userId !== snapshot.userId) {
      setSession(null);
      throw Object.assign(new Error('Tài khoản đăng nhập đã thay đổi ở tab khác. Vui lòng đăng nhập lại.'), { status: 401, code: 'SESSION_IDENTITY_CHANGED' });
    }
    setSession({ ...getSession(), token });
    const refreshed = getSessionSnapshot();
    lastRefresh = { source: snapshot.revision, target: refreshed.revision };
    return refreshed;
  } catch (error) {
    if ([401, 403].includes(error.status) && getSessionSnapshot().revision === snapshot.revision) setSession(null);
    throw error;
  }
}
// Làm mới phiên cho snapshot đã cho; trả về snapshot mới hoặc null nếu không thể làm mới.
export function refreshSession(snapshot = getSessionSnapshot()) {
  const current = getSessionSnapshot();
  if (!snapshot.token) return Promise.resolve(null);
  if (current.revision !== snapshot.revision) {
    const knownRefresh = lastRefresh?.source === snapshot.revision && lastRefresh.target === current.revision;
    return Promise.resolve(knownRefresh ? current : null);
  }
  if (refreshFlight?.revision === snapshot.revision) return refreshFlight.promise;
  const flight = { revision: snapshot.revision, promise: null };
  flight.promise = performRefresh(snapshot).finally(() => {
    if (refreshFlight === flight) refreshFlight = null;
  });
  refreshFlight = flight;
  return flight.promise;
}
// Gắn token hiện tại vào mỗi request và lưu snapshot phiên để biết request được gửi với phiên nào.
apiClient.interceptors.request.use((config) => {
  const snapshot = getSessionSnapshot();
  config.sessionSnapshot = snapshot;
  if (snapshot.token) config.headers.Authorization = 'Bearer ' + snapshot.token;
  else delete config.headers.Authorization;
  return config;
});
// Trả về response.data; khi 401 trên API cần đăng nhập thì làm mới phiên và thử lại đúng một lần,
// nếu vẫn 401 với cùng phiên thì xóa phiên để người dùng đăng nhập lại.
apiClient.interceptors.response.use((response) => response.data, async (error) => {
  if (axios.isCancel(error)) throw error;
  const config = error.config;
  const snapshot = config?.sessionSnapshot;
  const protectedFailure = error.response?.status === 401 && snapshot?.token && !isAuthHandshake(config.url);
  if (protectedFailure && !config.skipAuthRefresh && !config.authRetried) {
    const refreshed = await refreshSession(snapshot);
    if (refreshed && refreshed.revision === getSessionSnapshot().revision) {
      return apiClient.request({ ...config, authRetried: true });
    }
  }
  if (protectedFailure && config.authRetried && snapshot.revision === getSessionSnapshot().revision) setSession(null);
  throw normalizeApiError(error);
});
export default apiClient;
