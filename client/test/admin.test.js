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
