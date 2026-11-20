// D:/SWP391/SWP391/client/test/aiRefresh.test.js
// Kiểm thử (node:test) cơ chế làm mới token khi stream AI trả về 401: thử lại một lần, không lặp vô hạn và không làm mới nhầm tài khoản mới.
import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import apiClient from '../src/services/apiClient.js';
import { getSession, setSession } from '../src/utils/session.js';
import { streamChat } from '../src/services/aiApi.js';

// Lưu adapter và các biến toàn cục gốc để khôi phục sau mỗi test.
const originalAdapter = apiClient.defaults.adapter;
const originals = Object.fromEntries(['window', 'sessionStorage', 'localStorage', 'fetch'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
// Response SSE thành công giả lập AI trả lời đầy đủ.
const done = () => new Response('event: token\ndata: {"token":"Actual reply"}\n\nevent: done\ndata: {"remaining":null}\n\n',
  { headers: { 'Content-Type': 'text/event-stream' } });
// Response 401 giả lập token đã hết hạn.
const expired = () => new Response(JSON.stringify({ success: false, errorCode: 'UNAUTHORIZED', message: 'Expired' }), { status: 401 });
// Mỗi test bắt đầu với phiên có token hết hạn; adapter axios giả lập endpoint refresh trả token mới.
beforeEach(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent() {} } });
  for (const key of ['sessionStorage', 'localStorage']) Object.defineProperty(globalThis, key,
    { configurable: true, value: { getItem: () => null, setItem() {}, removeItem() {} } });
  setSession({ token: 'expired', user: { user_id: 7 } });
  apiClient.defaults.adapter = async (config) => ({ config, status: 200, statusText: 'OK', headers: {}, data: { success: true, data: { token: 'fresh', userId: 7 } } });
});
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  setSession(null);
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
});

// Gặp 401 phải refresh token rồi thử lại với đúng body cũ và gửi kèm cookie (credentials: include).
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

// Nếu vẫn 401 sau khi refresh thì báo lỗi và xóa phiên, chỉ thử lại đúng một lần.
test('rejects a repeatedly unauthorized AI request without retrying indefinitely', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return expired(); };
  await assert.rejects(streamChat({ message: 'Question' }), (error) => error.status === 401);
  assert.equal(calls, 2);
  assert.equal(getSession(), null);
});

// Nếu trong lúc request người dùng đã đăng nhập tài khoản khác thì không được refresh/xóa phiên của tài khoản mới.
test('does not refresh a newer account for an old AI request', async () => {
  let refreshes = 0;
  apiClient.defaults.adapter = async () => { refreshes += 1; throw new Error('Must not refresh another account'); };
  // Đổi phiên ngay trong lúc request đang chạy để mô phỏng response 401 đến muộn của tài khoản cũ.
  globalThis.fetch = async () => {
    setSession({ token: 'new-login', user: { user_id: 8 } });
    return expired();
  };
  await assert.rejects(streamChat({ message: 'Old account question' }), (error) => error.status === 401);
  assert.equal(refreshes, 0);
  assert.equal(getSession().token, 'new-login');
});
