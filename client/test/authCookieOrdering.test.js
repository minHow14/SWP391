// D:/SWP391/SWP391/client/test/authCookieOrdering.test.js
import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import apiClient from '../src/services/apiClient.js';
import { authService } from '../src/services/authService.js';
import { getSession, setSession } from '../src/utils/session.js';

const originalAdapter = apiClient.defaults.adapter;
const success = (config, data = {}) => ({ config, status: 200, headers: {}, data: { success: true, data } });
beforeEach(() => setSession({ token: 'old-member', user: { user_id: 7 } }, { remember: false }));
afterEach(() => { apiClient.defaults.adapter = originalAdapter; setSession(null); });

for (const method of ['login', 'register', 'logout']) {
  test(`${method} waits for a password-change cookie response so it cannot overwrite a newer cookie`, async () => {
    let release;
    let started;
    const calls = [];
    const changeStarted = new Promise((resolve) => { started = resolve; });
    apiClient.defaults.adapter = async (config) => {
      calls.push(config.url);
      if (config.url === '/v1/auth/change-password') {
        started();
        return new Promise((resolve) => { release = () => resolve(success(config, { token: 'password-changed' })); });
      }
      return success(config, { token: 'new-session', user: { user_id: 8 } });
    };
    const changing = authService.changePassword({ currentPassword: 'old-password', newPassword: 'new-password' });
    await changeStarted;
    const next = authService[method]({ email: 'next@example.invalid', password: 'next-password' });
    if (method === 'logout') assert.equal(getSession(), null);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, ['/v1/auth/change-password']);
    release(); await Promise.all([changing, next]);
    assert.deepEqual(calls, ['/v1/auth/change-password', `/auth/${method}`]);
    if (method === 'logout') assert.equal(getSession(), null);
  });
}
