// D:/SWP391/SWP391/client/test/authRecoveryService.test.js
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import apiClient from '../src/services/apiClient.js';
import { authService } from '../src/services/authService.js';

const originalAdapter = apiClient.defaults.adapter;
afterEach(() => { apiClient.defaults.adapter = originalAdapter; });
test('password recovery wrappers send real gateway contracts without confirmation or alternate field names', async () => {
  const calls = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push({ url: config.url, data: JSON.parse(config.data) });
    return { config, status: 200, headers: {}, data: { success: true, message: 'Yêu cầu đã được xử lý.', data: null } };
  };
  await authService.forgotPassword({ email: 'member@example.invalid' });
  await authService.resetPassword({ token: 'a'.repeat(64), newPassword: 'new-password' });
  assert.deepEqual(calls, [
    { url: '/v1/auth/forgot-password', data: { email: 'member@example.invalid' } },
    { url: '/v1/auth/reset-password', data: { token: 'a'.repeat(64), newPassword: 'new-password' } },
  ]);
});
