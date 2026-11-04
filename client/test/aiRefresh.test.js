// D:/SWP391/SWP391/client/test/aiRefresh.test.js
import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import apiClient from '../src/services/apiClient.js';
import { getSession, setSession } from '../src/utils/session.js';
import { streamChat } from '../src/services/aiApi.js';

const originalAdapter = apiClient.defaults.adapter;
const originals = Object.fromEntries(['window', 'sessionStorage', 'localStorage', 'fetch'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const done = () => new Response('event: token\ndata: {"token":"Actual reply"}\n\nevent: done\ndata: {"remaining":null}\n\n',
  { headers: { 'Content-Type': 'text/event-stream' } });
const expired = () => new Response(JSON.stringify({ success: false, errorCode: 'UNAUTHORIZED', message: 'Expired' }), { status: 401 });
beforeEach(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent() {} } });
  for (const key of ['sessionStorage', 'localStorage']) Object.defineProperty(globalThis, key,
    { configurable: true, value: { getItem: () => null, setItem() {}, removeItem() {} } });
  setSession({ token: 'expired', user: { user_id: 7 } });
  apiClient.defaults.adapter = async (config) => ({ config, status: 200, statusText: 'OK', headers: {}, data: { success: true, data: { token: 'fresh' } } });
});
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  setSession(null);
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
});

test('refreshes before retrying an unauthorized AI stream with the same request body', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return options.headers.Authorization === 'Bearer expired' ? expired() : done();
  };
  const tokens = [];
  await streamChat({ message: 'Question', onToken: (token) => tokens.push(token) });
  assert.equal(tokens.join(''), 'Actual reply');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.body, calls[1].options.body);
  assert.equal(calls[1].options.credentials, 'include');
  assert.equal(getSession().token, 'fresh');
});

test('rejects a repeatedly unauthorized AI request without retrying indefinitely', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return expired(); };
  await assert.rejects(streamChat({ message: 'Question' }), (error) => error.status === 401);
  assert.equal(calls, 2);
  assert.equal(getSession(), null);
});

test('does not refresh a newer account for an old AI request', async () => {
  let refreshes = 0;
  apiClient.defaults.adapter = async () => { refreshes += 1; throw new Error('Must not refresh another account'); };
  globalThis.fetch = async () => {
    setSession({ token: 'new-login', user: { user_id: 8 } });
    return expired();
  };
  await assert.rejects(streamChat({ message: 'Old account question' }), (error) => error.status === 401);
  assert.equal(refreshes, 0);
  assert.equal(getSession().token, 'new-login');
});
