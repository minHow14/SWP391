// client/src/utils/syncEvents.js

// Đồng bộ thay đổi dữ liệu giữa các component trong tab (CustomEvent) và giữa các tab (BroadcastChannel).
const SYNC_CHANNEL_NAME = 'chayxanh-sync';
let channel = null;

try {
  if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
    channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch {
  // BroadcastChannel không khả dụng (môi trường test Node.js hoặc trình duyệt không hỗ trợ)
}

/**
 * Phát sự kiện đồng bộ tới các component trong tab hiện tại và các tab trình duyệt khác.
 * @param {string} type - Loại sự kiện (ví dụ 'POST_CHANGED', 'COMMENT_CHANGED', 'CATEGORY_CHANGED', 'USER_CHANGED', 'REPORT_CHANGED', 'AI_CHANGED', 'MODERATION_CHANGED')
 * @param {object} payload - Dữ liệu kèm theo (tùy chọn)
 */
export function emitSyncEvent(type, payload = {}) {
  const detail = { type, payload, timestamp: Date.now() };

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('chayxanh-sync', { detail }));
    } catch {
      // Bỏ qua nếu trình duyệt không hỗ trợ CustomEvent
    }
  }

  if (channel) {
    try {
      channel.postMessage(detail);
    } catch {
      // Bỏ qua lỗi khi phát qua BroadcastChannel
    }
  }
}

/**
 * Đăng ký lắng nghe sự kiện đồng bộ.
 * @param {string|string[]} types - Loại sự kiện, mảng các loại, hoặc '*' để nghe tất cả
 * @param {function} callback - Hàm xử lý nhận chi tiết sự kiện
 * @returns {function} Hàm hủy đăng ký
 */
export function subscribeSyncEvent(types, callback) {
  if (typeof window === 'undefined') return () => {};

  const typeList = Array.isArray(types) ? types : [types];
  const isMatch = (evType) => typeList.includes('*') || typeList.includes(evType);

  const windowListener = (e) => {
    if (e?.detail && isMatch(e.detail.type)) {
      callback(e.detail);
    }
  };

  const channelListener = (e) => {
    if (e?.data && isMatch(e.data.type)) {
      callback(e.data);
    }
  };

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('chayxanh-sync', windowListener);
  }

  if (channel && typeof channel.addEventListener === 'function') {
    channel.addEventListener('message', channelListener);
  }

  return () => {
    if (typeof window.removeEventListener === 'function') {
      window.removeEventListener('chayxanh-sync', windowListener);
    }
    if (channel && typeof channel.removeEventListener === 'function') {
      channel.removeEventListener('message', channelListener);
    }
  };
}
