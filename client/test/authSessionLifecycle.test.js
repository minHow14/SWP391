// D:/SWP391/SWP391/client/test/authSessionLifecycle.test.js
import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import apiClient from '../src/services/apiClient.js';
import { authService } from '../src/services/authService.js';
import { getSession, getSessionSnapshot, setSession } from '../src/utils/session.js';

const SESSION_KEY = 'chayxanh-session';
const originalAdapter = apiClient.defaults.adapter;
const originals = Object.fromEntries(['window', 'sessionStorage', 'localStorage'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
let sequence = 0;
function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}
const success = (config, data) => ({ config, status: 200, statusText: 'OK', headers: {}, data: { success: true, data } });
beforeEach(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent() {} } });
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(globalThis, key, { configurable: true, value: storage() });
  setSession(null);
});
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  setSession(null);
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

test('remembered sessions survive reload and refresh while tab sessions do not persist locally', async () => {
  setSession({ token: 'login', user: { user_id: 7 } }, { remember: true });
  assert.equal(JSON.parse(localStorage.getItem(SESSION_KEY)).token, 'login');
  assert.equal(sessionStorage.getItem(SESSION_KEY), null);
  const reloaded = await import(`../src/utils/session.js?remember-case=${sequence++}`);
  assert.equal(reloaded.getSession().token, 'login');
  reloaded.setSession({ ...reloaded.getSession(), token: 'refreshed' });
  assert.equal(JSON.parse(localStorage.getItem(SESSION_KEY)).token, 'refreshed');
  assert.equal(sessionStorage.getItem(SESSION_KEY), null);
  setSession({ token: 'tab', user: { user_id: 8 } }, { remember: false });
  assert.equal(localStorage.getItem(SESSION_KEY), null);
  assert.equal(JSON.parse(sessionStorage.getItem(SESSION_KEY)).token, 'tab');
});

test('logout clears both stores and updates the existing revision snapshot API', () => {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'older' }));
  setSession({ token: 'active' }, { remember: false });
  const before = getSessionSnapshot();
  setSession(null);
  assert.equal(getSession(), null);
  assert.equal(localStorage.getItem(SESSION_KEY), null);
  assert.equal(sessionStorage.getItem(SESSION_KEY), null);
  assert.ok(getSessionSnapshot().revision > before.revision);
});

test('remember works in memory when both browser storages are blocked', () => {
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(globalThis, key, { configurable: true, get() { throw new Error('Blocked'); } });
  setSession({ token: 'memory' }, { remember: true });
  assert.equal(getSession().token, 'memory');
  setSession(null);
  assert.equal(getSession(), null);
});

test('logout clears the local session immediately and login waits until its cookie response completes', async () => {
  let release;
  let started;
  const calls = [];
  const logoutStarted = new Promise((resolve) => { started = resolve; });
  apiClient.defaults.adapter = async (config) => {
    calls.push(config.url);
    if (config.url === '/auth/logout') {
      started();
      return new Promise((resolve) => { release = () => resolve(success(config, {})); });
    }
    return success(config, { token: 'new', user: { user_id: 8 } });
  };
  setSession({ token: 'old', user: { user_id: 7 } });
  const logout = authService.logout();
  assert.equal(getSession(), null);
  await logoutStarted;
  const login = authService.login({ email: 'member@example.invalid', password: 'secret-password' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, ['/auth/logout']);
  release(); await Promise.all([logout, login]);
  assert.deepEqual(calls, ['/auth/logout', '/auth/login']);
});

test('registration can proceed after a failed logout without resurrecting the old session', async () => {
  let reject;
  apiClient.defaults.adapter = async (config) => config.url === '/auth/logout'
    ? new Promise((_, fail) => { reject = fail; }) : success(config, { token: 'registered' });
  setSession({ token: 'old' });
  const logout = authService.logout();
  const failed = assert.rejects(logout, /Offline/);
  await new Promise((resolve) => setImmediate(resolve));
  const registration = authService.register({ email: 'new@example.invalid', password: 'new-password' });
  reject(new Error('Offline'));
  await failed;
  assert.equal((await registration).data.token, 'registered');
  assert.equal(getSession(), null);
});

test('changing password replaces a revoked token and retains profile and remember preference', async () => {
  setSession({ token: 'before', user: { user_id: 7, full_name: 'Tên đã lưu' } }, { remember: true });
  apiClient.defaults.adapter = async (config) => success(config, { token: 'after' });
  await authService.changePassword({ currentPassword: 'old-password', newPassword: 'new-password' });
  assert.equal(getSession().token, 'after');
  assert.equal(getSession().user.full_name, 'Tên đã lưu');
  assert.equal(JSON.parse(localStorage.getItem(SESSION_KEY)).token, 'after');
});

for (const transition of ['logout', 'another user', 'new login to same user']) {
  test(`a late password-change response cannot replace ${transition}`, async () => {
    setSession({ token: 'before', user: { user_id: 7 } }, { remember: false });
    apiClient.defaults.adapter = async (config) => {
      if (transition === 'logout') setSession(null);
      else setSession({ token: 'newer', user: { user_id: transition === 'another user' ? 8 : 7 } }, { remember: true });
      return success(config, { token: 'late-password-token' });
    };
    await authService.changePassword({ currentPassword: 'old-password', newPassword: 'new-password' });
    assert.equal(getSession()?.token ?? null, transition === 'logout' ? null : 'newer');
  });
}

test('a password change still rotates its token after a same-session profile update', async () => {
  setSession({ token: 'before', user: { user_id: 7, full_name: 'Tên cũ' } }, { remember: true });
  apiClient.defaults.adapter = async (config) => {
    setSession({ ...getSession(), user: { user_id: 7, full_name: 'Tên mới' } });
    return success(config, { token: 'after' });
  };
  await authService.changePassword({ currentPassword: 'old-password', newPassword: 'new-password' });
  assert.equal(getSession().token, 'after');
  assert.equal(getSession().user.full_name, 'Tên mới');
});

test('a password change replaces the refreshed token that the backend just revoked', async () => {
  setSession({ token: 'expired', user: { user_id: 7 } }, { remember: true });
  apiClient.defaults.adapter = async (config) => {
    if (config.url === '/auth/refresh') return success(config, { token: 'refreshed', userId: 7 });
    if (config.headers.Authorization === 'Bearer expired') throw new axios.AxiosError('Expired', 'ERR_BAD_REQUEST', config, undefined,
      { status: 401, data: { success: false, message: 'Phiên hết hạn' }, headers: {}, config });
    return success(config, { token: 'password-rotated' });
  };
  await authService.changePassword({ currentPassword: 'old-password', newPassword: 'new-password' });
  assert.equal(getSession().token, 'password-rotated');
});
