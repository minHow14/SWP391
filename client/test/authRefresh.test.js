// D:/SWP391/SWP391/client/test/authRefresh.test.js
import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import apiClient from '../src/services/apiClient.js';
import { getSession, setSession } from '../src/utils/session.js';

const originalAdapter = apiClient.defaults.adapter;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
const success = (config, data) => ({ config, data: { success: true, data }, status: 200, statusText: 'OK', headers: {} });
const unauthorized = (config) => new axios.AxiosError('Expired', 'ERR_BAD_REQUEST', config, undefined,
  { status: 401, data: { success: false, message: 'Phiên hết hạn', errorCode: 'UNAUTHORIZED' }, headers: {}, config });

test('rejects a refresh cookie belonging to a different tab account without retrying the write', async () => {
  const calls = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config.url);
    if (config.url === '/auth/refresh') return success(config, { token: 'other-account-token', userId: 8 });
    if (config.headers.Authorization === 'Bearer expired') throw unauthorized(config);
    return success(config, { saved: true });
  };
  await assert.rejects(apiClient.patch('/auth/me', { full_name: 'Account A profile' }), (error) => error.status === 401);
  assert.deepEqual(calls, ['/auth/me', '/auth/refresh']);
  assert.equal(getSession(), null);
});
beforeEach(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent() {} } });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: () => null, setItem() {}, removeItem() {} } });
  setSession({ token: 'expired', user: { user_id: 7 } });
});
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  setSession(null);
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else delete globalThis.window;
  if (originalStorage) Object.defineProperty(globalThis, 'sessionStorage', originalStorage); else delete globalThis.sessionStorage;
});

test('refreshes an expired token and retries the original request with its body intact', async () => {
  const calls = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    if (config.url === '/auth/refresh') return success(config, { token: 'fresh', userId: 7 });
    if (config.headers.Authorization === 'Bearer expired') throw unauthorized(config);
    return success(config, { saved: true });
  };
  const result = await apiClient.patch('/auth/me', { full_name: 'Updated profile' });
  assert.deepEqual(result.data, { saved: true });
  assert.equal(getSession().token, 'fresh');
  assert.equal(calls.filter((call) => call.url === '/auth/refresh').length, 1);
  assert.equal(calls.at(-1).headers.Authorization, 'Bearer fresh');
  assert.deepEqual(JSON.parse(calls.at(-1).data), { full_name: 'Updated profile' });
});

test('coalesces simultaneous unauthorized requests into one refresh', async () => {
  let release;
  let started;
  let refreshCount = 0;
  const refreshStarted = new Promise((resolve) => { started = resolve; });
  apiClient.defaults.adapter = async (config) => {
    if (config.url === '/auth/refresh') {
      refreshCount += 1; started('refresh');
      return new Promise((resolve) => { release = () => resolve(success(config, { accessToken: 'fresh', userId: 7 })); });
    }
    if (config.headers.Authorization === 'Bearer expired') throw unauthorized(config);
    return success(config, { url: config.url });
  };
  const requests = Promise.all([apiClient.get('/auth/me'), apiClient.get('/workspace/journal')]);
  assert.equal(await Promise.race([refreshStarted, requests.then(() => 'finished', () => 'failed')]), 'refresh');
  release();
  assert.equal((await requests).length, 2);
  assert.equal(refreshCount, 1);
});

test('clears the expired session if the refresh cookie is rejected without looping', async () => {
  const calls = [];
  apiClient.defaults.adapter = async (config) => { calls.push(config.url); throw unauthorized(config); };
  await assert.rejects(apiClient.get('/auth/me'), (error) => error.status === 401);
  assert.equal(getSession(), null);
  assert.deepEqual(calls, ['/auth/me', '/auth/refresh']);
});

test('keeps the session when refreshing fails with a transient network error', async () => {
  apiClient.defaults.adapter = async (config) => {
    if (config.url === '/auth/refresh') throw new axios.AxiosError('Offline', 'ERR_NETWORK', config);
    throw unauthorized(config);
  };
  await assert.rejects(apiClient.get('/auth/me'), (error) => error.code === 'ERR_NETWORK');
  assert.equal(getSession().token, 'expired');
});

test('does not overwrite or retry a newer login when an old refresh completes', async () => {
  let release;
  let started;
  const calls = [];
  const refreshStarted = new Promise((resolve) => { started = resolve; });
  apiClient.defaults.adapter = async (config) => {
    calls.push(config.url);
    if (config.url === '/auth/refresh') {
      started('refresh');
      return new Promise((resolve) => { release = () => resolve(success(config, { token: 'late-old-token' })); });
    }
    throw unauthorized(config);
  };
  const request = apiClient.get('/workspace/journal');
  const failure = assert.rejects(request);
  assert.equal(await Promise.race([refreshStarted, request.then(() => 'finished', () => 'failed')]), 'refresh');
  setSession({ token: 'new-login', user: { user_id: 8 } }); release();
  await failure;
  assert.equal(getSession().token, 'new-login');
  assert.deepEqual(calls, ['/workspace/journal', '/auth/refresh']);
});

test('does not restore a locally logged out session when refresh completes', async () => {
  let release;
  let started;
  const refreshStarted = new Promise((resolve) => { started = resolve; });
  apiClient.defaults.adapter = async (config) => {
    if (config.url === '/auth/refresh') {
      started('refresh');
      return new Promise((resolve) => { release = () => resolve(success(config, { token: 'late-token' })); });
    }
    throw unauthorized(config);
  };
  const request = apiClient.get('/auth/me');
  const failure = assert.rejects(request);
  assert.equal(await Promise.race([refreshStarted, request.then(() => 'finished', () => 'failed')]), 'refresh');
  setSession(null); release();
  await failure;
  assert.equal(getSession(), null);
});

test('does not refresh or clear an existing session for rejected login credentials', async () => {
  const calls = [];
  apiClient.defaults.adapter = async (config) => { calls.push(config.url); throw unauthorized(config); };
  await assert.rejects(apiClient.post('/auth/login', { email: 'wrong@example.invalid', password: 'invalid' }));
  assert.equal(getSession().token, 'expired');
  assert.deepEqual(calls, ['/auth/login']);
});

test('retries a protected request only once when the refreshed token is also rejected', async () => {
  const calls = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config.url);
    if (config.url === '/auth/refresh') return success(config, { token: 'also-rejected', userId: 7 });
    throw unauthorized(config);
  };
  await assert.rejects(apiClient.get('/auth/me'), (error) => error.status === 401);
  assert.equal(getSession(), null);
  assert.deepEqual(calls, ['/auth/me', '/auth/refresh', '/auth/me']);
});
