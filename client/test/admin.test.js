// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/admin.test.js
// Kiểm thử (node:test) cho tầng service quản trị: hợp đồng adminService, việc apiClient gắn token,
// cơ chế đồng bộ sự kiện giữa các component và việc ghi nhớ tab đang mở của trang quản trị.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { adminService } from '../src/services/adminService.js';
import apiClient from '../src/services/apiClient.js';
import { setSession } from '../src/utils/session.js';

// Lưu lại window/sessionStorage gốc vì các test bên dưới ghi đè chúng bằng bản giả lập.
const originalWindow = globalThis.window;
const originalSessionStorage = globalThis.sessionStorage;

// Khôi phục môi trường toàn cục sau mỗi test để test sau không bị ảnh hưởng bởi giả lập của test trước.
afterEach(() => {
  if (originalWindow) globalThis.window = originalWindow;
  else delete globalThis.window;

  if (originalSessionStorage) globalThis.sessionStorage = originalSessionStorage;
  else delete globalThis.sessionStorage;
});

// Đảm bảo adminService công bố đủ các hàm quản trị mà các tab admin đang gọi, tránh lỗi "is not a function" khi chạy thật.
test('adminService defines all required management API functions', () => {
  assert.equal(typeof adminService.getDashboardStats, 'function');
  assert.equal(typeof adminService.getUsers, 'function');
  assert.equal(typeof adminService.getUserContent, 'function');
  assert.equal(typeof adminService.updateUserStatus, 'function');
  assert.equal(typeof adminService.deleteUser, 'function');
  assert.equal(typeof adminService.getPosts, 'function');
  assert.equal(typeof adminService.updatePostStatus, 'function');
  assert.equal(typeof adminService.updatePost, 'function');
  assert.equal(typeof adminService.deletePost, 'function');
  assert.equal(typeof adminService.getComments, 'function');
  assert.equal(typeof adminService.updateCommentStatus, 'function');
  assert.equal(typeof adminService.deleteComment, 'function');
  assert.equal(typeof adminService.getCategories, 'function');
  assert.equal(typeof adminService.createCategory, 'function');
  assert.equal(typeof adminService.updateCategory, 'function');
  assert.equal(typeof adminService.deleteCategory, 'function');
  assert.equal(typeof adminService.getAiFlaggedContent, 'function');
  assert.equal(typeof adminService.resolveAiFlaggedItem, 'function');
  assert.equal(typeof adminService.getAiModels, 'function');
  assert.equal(typeof adminService.getAiLogs, 'function');
  assert.equal(typeof adminService.getAiMetrics, 'function');
  assert.equal(typeof adminService.interveneAi, 'function');
  assert.equal(typeof adminService.getReports, 'function');
  assert.equal(typeof adminService.updateReportStatus, 'function');
});

// Kiểm tra interceptor của apiClient tự gắn header Authorization dạng Bearer từ phiên đăng nhập hiện tại.
test('apiClient attaches Bearer token from session storage', async () => {
  // Giả lập window/sessionStorage tối thiểu vì môi trường node:test không có DOM.
  globalThis.window = { dispatchEvent: () => {} };
  globalThis.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };

  setSession({ token: 'mock-admin-token', user: { user_id: 1, role: 1 } });
  let capturedHeaders = null;

  // Thay adapter của axios để chặn request thật và bắt lại header đã gửi đi.
  const originalAdapter = apiClient.defaults.adapter;
  apiClient.defaults.adapter = async (config) => {
    capturedHeaders = config.headers;
    return {
      data: { success: true, data: { test: true } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  // Luôn trả adapter gốc và xóa phiên trong finally để không rò trạng thái sang test khác.
  try {
    const res = await apiClient.get('/admin/dashboard/stats');
    assert.equal(capturedHeaders.Authorization, 'Bearer mock-admin-token');
    assert.deepEqual(res, { success: true, data: { test: true } });
  } finally {
    apiClient.defaults.adapter = originalAdapter;
    setSession(null);
  }
});

// Kiểm tra syncEvents: chỉ listener đăng ký đúng loại sự kiện mới nhận được, và hủy đăng ký thì ngừng nhận.
test('syncEvents dispatches and subscribes to real-time events across components', async () => {
  const listeners = [];
  // Giả lập hệ thống sự kiện của window bằng mảng listener vì node:test không có EventTarget của trình duyệt.
  globalThis.window = {
    addEventListener: (name, fn) => {
      if (name === 'chayxanh-sync') listeners.push(fn);
    },
    removeEventListener: (name, fn) => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    },
    dispatchEvent: (event) => {
      listeners.forEach((fn) => fn(event));
    },
  };
  // Giả lập CustomEvent vì Node không cung cấp sẵn lớp này như trình duyệt.
  globalThis.CustomEvent = class {
    constructor(name, options) {
      this.name = name;
      this.detail = options?.detail;
    }
  };

  // Import động sau khi đã giả lập window để module dùng đúng bản giả lập.
  const { emitSyncEvent, subscribeSyncEvent } = await import('../src/utils/syncEvents.js');

  const received = [];
  const unsubscribe = subscribeSyncEvent(['POST_CHANGED', 'COMMENT_CHANGED'], (detail) => {
    received.push(detail);
  });

  emitSyncEvent('POST_CHANGED', { postId: 101 });
  emitSyncEvent('USER_CHANGED', { userId: 5 }); // Loại sự kiện này không được đăng ký nên không được nhận
  emitSyncEvent('COMMENT_CHANGED', { commentId: 202 });

  assert.equal(received.length, 2);
  assert.equal(received[0].type, 'POST_CHANGED');
  assert.equal(received[0].payload.postId, 101);
  assert.equal(received[1].type, 'COMMENT_CHANGED');
  assert.equal(received[1].payload.commentId, 202);

  // Sau khi hủy đăng ký, sự kiện mới không được làm tăng số lượng đã nhận.
  unsubscribe();
  emitSyncEvent('POST_CHANGED', { postId: 999 });
  assert.equal(received.length, 2);
});

// Kiểm tra quy tắc chọn tab ban đầu: ưu tiên query param, sau đó tab đã lưu, cuối cùng mặc định là dashboard.
test('tab state persistence maintains current tab across page reloads', () => {
  // Dùng Map làm sessionStorage giả để lưu/đọc giá trị thật trong phạm vi test.
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
  };

  const VALID_TABS = ['dashboard', 'members', 'posts', 'comments', 'categories', 'ai-moderation', 'ai-monitor', 'reports'];

  // Giả lập người dùng tải lại trang khi đang ở tab 'reports'
  sessionStorage.setItem('admin_active_tab', 'reports');

  // Bản sao logic chọn tab ban đầu của trang admin để kiểm tra độc lập với component.
  const getInitialTab = (searchParamTab) => {
    if (searchParamTab && VALID_TABS.includes(searchParamTab)) return searchParamTab;
    const saved = sessionStorage.getItem('admin_active_tab');
    if (saved && VALID_TABS.includes(saved)) return saved;
    return 'dashboard';
  };

  // 1. Có query param thì dùng tab trong query param
  assert.equal(getInitialTab('posts'), 'posts');

  // 2. Không có query param (ví dụ F5 hoặc tải lại trực tiếp /admin) thì lấy tab đã lưu
  assert.equal(getInitialTab(null), 'reports');

  // 3. Tab đã lưu không hợp lệ thì quay về dashboard
  sessionStorage.setItem('admin_active_tab', 'invalid_tab');
  assert.equal(getInitialTab(null), 'dashboard');
});
