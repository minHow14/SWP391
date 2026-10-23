// client/test/notificationService.test.js
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { notificationService } from '../src/services/notificationService.js';
import apiClient from '../src/services/apiClient.js';

const originalAdapter = apiClient.defaults.adapter;

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

test('notificationService defines all required notification API methods', () => {
  assert.equal(typeof notificationService.getNotifications, 'function');
  assert.equal(typeof notificationService.markAsRead, 'function');
  assert.equal(typeof notificationService.markAllAsRead, 'function');
  assert.equal(typeof notificationService.deleteNotification, 'function');
});

test('getNotifications sends GET request to /v1/notifications with pagination and filters', async () => {
  let capturedConfig = null;
  apiClient.defaults.adapter = async (config) => {
    capturedConfig = config;
    return {
      data: {
        success: true,
        data: [{ notification_id: 1, title: 'Bình luận mới' }],
        meta: { page: 1, limit: 10, total: 1, unreadCount: 1 },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  const result = await notificationService.getNotifications({ page: 1, limit: 10, unreadOnly: true });

  assert.equal(capturedConfig.method.toLowerCase(), 'get');
  assert.equal(capturedConfig.url, '/v1/notifications');
  assert.equal(capturedConfig.params.page, 1);
  assert.equal(capturedConfig.params.limit, 10);
  assert.equal(capturedConfig.params.unreadOnly, true);
  assert.equal(result.data.length, 1);
  assert.equal(result.meta.unreadCount, 1);
});

test('markAsRead sends PATCH request to /v1/notifications/:id/read', async () => {
  let capturedConfig = null;
  apiClient.defaults.adapter = async (config) => {
    capturedConfig = config;
    return {
      data: { success: true, message: 'Đã đánh dấu thông báo là đã đọc.' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  const result = await notificationService.markAsRead(42);

  assert.equal(capturedConfig.method.toLowerCase(), 'patch');
  assert.equal(capturedConfig.url, '/v1/notifications/42/read');
  assert.equal(result.success, true);
});

test('markAllAsRead sends PATCH request to /v1/notifications/read-all', async () => {
  let capturedConfig = null;
  apiClient.defaults.adapter = async (config) => {
    capturedConfig = config;
    return {
      data: { success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc.' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  const result = await notificationService.markAllAsRead();

  assert.equal(capturedConfig.method.toLowerCase(), 'patch');
  assert.equal(capturedConfig.url, '/v1/notifications/read-all');
  assert.equal(result.success, true);
});

test('deleteNotification sends DELETE request to /v1/notifications/:id', async () => {
  let capturedConfig = null;
  apiClient.defaults.adapter = async (config) => {
    capturedConfig = config;
    return {
      data: { success: true, message: 'Đã xóa thông báo thành công.' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  const result = await notificationService.deleteNotification(100);

  assert.equal(capturedConfig.method.toLowerCase(), 'delete');
  assert.equal(capturedConfig.url, '/v1/notifications/100');
  assert.equal(result.success, true);
});
