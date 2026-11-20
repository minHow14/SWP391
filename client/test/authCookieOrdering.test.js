// D:/SWP391/SWP391/client/test/authCookieOrdering.test.js
// Kiểm thử (node:test) thứ tự request auth: login/register/logout phải chờ request đổi mật khẩu xong để không ghi đè cookie mới hơn.
import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import apiClient from '../src/services/apiClient.js';
import { authService } from '../src/services/authService.js';
import { getSession, setSession } from '../src/utils/session.js';

const originalAdapter = apiClient.defaults.adapter;
// Tạo response thành công theo envelope chuẩn.
const success = (config, data = {}) => ({ config, status: 200, headers: {}, data: { success: true, data } });
// Mỗi test bắt đầu với một phiên thành viên không ghi nhớ đăng nhập.
beforeEach(() => setSession({ token: 'old-member', user: { user_id: 7 } }, { remember: false }));
afterEach(() => { apiClient.defaults.adapter = originalAdapter; setSession(null); });

// Chạy cùng kịch bản cho login, register và logout.
for (const method of ['login', 'register', 'logout']) {
  test(`${method} waits for a password-change cookie response so it cannot overwrite a newer cookie`, async () => {
    let release;
    let started;
    const calls = [];
    const changeStarted = new Promise((resolve) => { started = resolve; });
    // Adapter giữ request đổi mật khẩu ở trạng thái chờ đến khi gọi release(), các request khác trả phiên mới ngay.
    apiClient.defaults.adapter = async (config) => {
      calls.push(config.url);
      if (config.url === '/v1/auth/change-password') {
        started();
        return new Promise((resolve) => { release = () => resolve(success(config, { token: 'password-changed' })); });
      }
      return success(config, { token: 'new-session', user: { user_id: 8 } });
    };
    // Bắt đầu đổi mật khẩu, chờ request được gửi đi rồi mới gọi thao tác auth tiếp theo.
    const changing = authService.changePassword({ currentPassword: 'old-password', newPassword: 'new-password' });
    await changeStarted;
    const next = authService[method]({ email: 'next@example.invalid', password: 'next-password' });
    if (method === 'logout') assert.equal(getSession(), null);
    // Nhường một vòng event loop để chắc chắn thao tác sau chưa được gửi khi đổi mật khẩu còn đang chờ.
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, ['/v1/auth/change-password']);
    release(); await Promise.all([changing, next]);
    assert.deepEqual(calls, ['/v1/auth/change-password', `/auth/${method}`]);
    if (method === 'logout') assert.equal(getSession(), null);
  });
}
