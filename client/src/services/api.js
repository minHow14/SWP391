// client/src/services/api.js
// Hàm gọi API dạng fetch đơn giản (không tự làm mới token), có timeout và chuẩn hóa thông báo lỗi.
import { getSession, setSession } from '../utils/session.js';

// Gọi /api{path}; trả về data của envelope, hoặc cả envelope khi includeMeta = true.
export async function api(
  path,
  { method = 'GET', body, signal, includeMeta = false } = {}
) {
  const session = getSession();
  let response;
  // Giới hạn 15 giây để giao diện không treo khi server không phản hồi.
  const timeout = AbortSignal.timeout(15000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal: requestSignal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.aborted)
      throw new Error('Yêu cầu quá thời gian chờ. Vui lòng thử lại.', {
        cause: error,
      });
    throw new Error('Không thể kết nối. Vui lòng thử lại sau.', {
      cause: error,
    });
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    // Chỉ xóa phiên khi token vẫn là token đã gửi, tránh đăng xuất nhầm phiên mới được tạo trong lúc chờ.
    if (
      response.status === 401 &&
      session?.token &&
      getSession()?.token === session.token
    )
      setSession(null);
    throw new Error(
      typeof result?.error === 'string'
        ? result.error
        : result?.error?.message || 'Không thể tải dữ liệu từ server.'
    );
  }
  return includeMeta ? result : (result.data ?? result);
}
