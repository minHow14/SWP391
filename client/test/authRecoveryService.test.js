// D:/SWP391/SWP391/client/test/authRecoveryService.test.js
// Kiểm thử (node:test) các hàm khôi phục mật khẩu của authService gửi đúng route và đúng tên trường theo hợp đồng gateway.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import apiClient from '../src/services/apiClient.js';
import { authService } from '../src/services/authService.js';

// Lưu adapter gốc của axios để khôi phục sau test.
const originalAdapter = apiClient.defaults.adapter;
afterEach(() => { apiClient.defaults.adapter = originalAdapter; });
// Các hàm khôi phục mật khẩu phải gửi đúng payload, không kèm trường xác nhận hay tên trường thay thế.
test('password recovery wrappers send real gateway contracts without confirmation or alternate field names', async () => {
  const calls = [];
  // Adapter giả ghi lại URL và body của từng request rồi trả response thành công.
  apiClient.defaults.adapter = async (config) => {
    calls.push({ url: config.url, data: JSON.parse(config.data) });
    return { config, status: 200, headers: {}, data: { success: true, message: 'Yêu cầu đã được xử lý.', data: null } };
  };
  await authService.forgotPassword({ email: 'member@example.invalid' });
  await authService.verifyPasswordResetOtp({ email: 'member@example.invalid', otp: '012345' });
  await authService.resetPassword({ token: 'a'.repeat(64), newPassword: 'new-password' });
  assert.deepEqual(calls, [
    { url: '/v1/auth/forgot-password', data: { email: 'member@example.invalid' } },
    { url: '/v1/auth/verify-password-reset-otp', data: { email: 'member@example.invalid', otp: '012345' } },
    { url: '/v1/auth/reset-password', data: { token: 'a'.repeat(64), newPassword: 'new-password' } },
  ]);
});
