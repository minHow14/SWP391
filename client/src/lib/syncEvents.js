// d:\Projects\FPT\SWP391\client\src\lib\syncEvents.js

const SYNC_CHANNEL_NAME = 'chayxanh-sync';
let channel = null;

try {
  if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
    channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch {
  // BroadcastChannel not available (Node.js test environment or unsupported browser)
}

/**
 * Emit a synchronization event across local components and other browser tabs.
 * @param {string} type - Event type (e.g., 'POST_CHANGED', 'COMMENT_CHANGED', 'CATEGORY_CHANGED', 'USER_CHANGED', 'REPORT_CHANGED', 'AI_CHANGED', 'MODERATION_CHANGED')
 * @param {object} payload - Optional payload data
 */
export function emitSyncEvent(type, payload = {}) {
  const detail = { type, payload, timestamp: Date.now() };

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('chayxanh-sync', { detail }));
    } catch {
      // Fallback
    }
  }

  if (channel) {
    try {
      channel.postMessage(detail);
    } catch {
      // Ignore broadcast errors
    }
  }
}

/**
 * Subscribe to synchronization events.
 * @param {string|string[]} types - Event type or array of types, or '*' for all
 * @param {function} callback - Handler callback receiving the event detail
 * @returns {function} Unsubscribe function
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
