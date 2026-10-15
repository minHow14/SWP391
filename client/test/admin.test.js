// d:\Projects\FPT\SWP391\client\test\admin.test.js
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { adminService } from '../src/services/adminService.js';
import apiClient from '../src/services/apiClient.js';
import { setSession } from '../src/lib/api.js';

const originalWindow = globalThis.window;
const originalSessionStorage = globalThis.sessionStorage;

afterEach(() => {
  if (originalWindow) globalThis.window = originalWindow;
  else delete globalThis.window;

  if (originalSessionStorage) globalThis.sessionStorage = originalSessionStorage;
  else delete globalThis.sessionStorage;
});

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

test('apiClient attaches Bearer token from session storage', async () => {
  globalThis.window = { dispatchEvent: () => {} };
  globalThis.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };

  setSession({ token: 'mock-admin-token', user: { user_id: 1, role: 1 } });
  let capturedHeaders = null;

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

  try {
    const res = await apiClient.get('/admin/dashboard/stats');
    assert.equal(capturedHeaders.Authorization, 'Bearer mock-admin-token');
    assert.deepEqual(res, { success: true, data: { test: true } });
  } finally {
    apiClient.defaults.adapter = originalAdapter;
    setSession(null);
  }
});

test('syncEvents dispatches and subscribes to real-time events across components', async () => {
  const listeners = [];
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
  globalThis.CustomEvent = class {
    constructor(name, options) {
      this.name = name;
      this.detail = options?.detail;
    }
  };

  const { emitSyncEvent, subscribeSyncEvent } = await import('../src/lib/syncEvents.js');

  const received = [];
  const unsubscribe = subscribeSyncEvent(['POST_CHANGED', 'COMMENT_CHANGED'], (detail) => {
    received.push(detail);
  });

  emitSyncEvent('POST_CHANGED', { postId: 101 });
  emitSyncEvent('USER_CHANGED', { userId: 5 }); // Should not match
  emitSyncEvent('COMMENT_CHANGED', { commentId: 202 });

  assert.equal(received.length, 2);
  assert.equal(received[0].type, 'POST_CHANGED');
  assert.equal(received[0].payload.postId, 101);
  assert.equal(received[1].type, 'COMMENT_CHANGED');
  assert.equal(received[1].payload.commentId, 202);

  unsubscribe();
  emitSyncEvent('POST_CHANGED', { postId: 999 });
  assert.equal(received.length, 2);
});

test('tab state persistence maintains current tab across page reloads', () => {
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
  };

  const VALID_TABS = ['dashboard', 'members', 'posts', 'comments', 'categories', 'ai-moderation', 'ai-monitor', 'reports'];

  // Simulate refresh on tab 'reports'
  sessionStorage.setItem('admin_active_tab', 'reports');

  const getInitialTab = (searchParamTab) => {
    if (searchParamTab && VALID_TABS.includes(searchParamTab)) return searchParamTab;
    const saved = sessionStorage.getItem('admin_active_tab');
    if (saved && VALID_TABS.includes(saved)) return saved;
    return 'dashboard';
  };

  // 1. With query param
  assert.equal(getInitialTab('posts'), 'posts');

  // 2. Without query param (e.g. F5 or direct reload on /admin)
  assert.equal(getInitialTab(null), 'reports');

  // 3. Invalid tab fallback
  sessionStorage.setItem('admin_active_tab', 'invalid_tab');
  assert.equal(getInitialTab(null), 'dashboard');
});
