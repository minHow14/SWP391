// D:/SWP391/SWP391/server/tests/frontendAuthIntegration.test.js
// Kiểm thử tích hợp FE ↔ BE (cần DB test): dùng chính apiClient/authService của client gọi tới server thật
// để xác minh luồng khôi phục mật khẩu OTP, tự refresh token và chống lẫn tài khoản giữa các tab.
import './loadTestEnvironment.js';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { hashPassword } from '../src/utils/jwt.js';
import apiClient from '../../client/src/services/apiClient.js';
import { authService } from '../../client/src/services/authService.js';
import { getSession, setSession } from '../../client/src/utils/session.js';

// Mock nodemailer để đọc mã OTP từ mail mà không gửi thật; lưu baseURL gốc để khôi phục sau test.
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn() } }));
const transport = { verify: vi.fn().mockResolvedValue(true), sendMail: vi.fn() };
const originalBaseUrl = apiClient.defaults.baseURL;
const ORIGINAL_PASSWORD = 'Integration-original-password';
const UPDATED_PASSWORD = 'Integration-updated-password';
let server;
let accounts = [];
let originalHash;

// Đăng nhập qua authService và lưu phiên như trình duyệt.
// @param account tài khoản test
// @param password mật khẩu dùng để đăng nhập
// @returns dữ liệu đăng nhập (token, refreshToken, user)
async function login(account, password = ORIGINAL_PASSWORD) {
  const result = await authService.login({ email: account.email, password });
  // Node không có cookie jar như trình duyệt; chỉ giả lập hành vi gửi cookie của trình duyệt.
  apiClient.defaults.headers.common.Cookie = `refreshToken=${result.data.refreshToken}`;
  setSession({ token: result.data.token, user: result.data.user }, { remember: false });
  return result.data;
}

// Thay access token trong phiên bằng token đã hết hạn để kích hoạt cơ chế tự refresh của client.
function expireAccess(account) {
  const token = jwt.sign({ user_id: account.user_id, tokenVersion: account.tokenVersion }, process.env.JWT_SECRET, { expiresIn: -1 });
  setSession({ ...getSession(), token });
}

// Khởi động server thật trên cổng ngẫu nhiên và trỏ apiClient tới đó.
beforeAll(async () => {
  originalHash = await hashPassword(ORIGINAL_PASSWORD);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  apiClient.defaults.baseURL = `http://127.0.0.1:${server.address().port}/api`;
});

// Cấu hình SMTP giả và tạo hai tài khoản test mới cho mỗi test.
beforeEach(async () => {
  vi.stubEnv('SMTP_HOST', 'smtp.integration.invalid');
  vi.stubEnv('SMTP_PORT', '587'); vi.stubEnv('SMTP_SECURE', 'false');
  vi.stubEnv('SMTP_USER', 'integration-mail-user'); vi.stubEnv('SMTP_PASS', 'integration-mail-password');
  vi.stubEnv('SMTP_FROM', 'recovery@example.invalid'); vi.stubEnv('CLIENT_URL', 'http://localhost:5173');
  vi.stubEnv('PASSWORD_RESET_TTL_MINUTES', '15');
  transport.sendMail.mockReset().mockImplementation(async ({ to }) => ({ accepted: [to] }));
  nodemailer.createTransport.mockReturnValue(transport);
  accounts = await Promise.all([1, 2].map((index) => prisma.user.create({ data: {
    email: `frontend-auth-${randomUUID()}@example.invalid`, full_name: `Integration account ${index}`, password_hash: originalHash,
  } })));
});

// Xóa phiên, cookie, tài khoản test và biến môi trường đã stub sau mỗi test.
afterEach(async () => {
  setSession(null);
  delete apiClient.defaults.headers.common.Cookie;
  await prisma.user.deleteMany({ where: { user_id: { in: accounts.map((account) => account.user_id) } } });
  accounts = [];
  vi.unstubAllEnvs();
});

// Khôi phục baseURL, đóng server và kết nối DB.
afterAll(async () => {
  apiClient.defaults.baseURL = originalBaseUrl;
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await prisma.$disconnect();
});

// Luồng OTP đầy đủ qua HTTP: token reset không dùng lại được, access/refresh token cũ bị thu hồi,
// mật khẩu cũ không còn đăng nhập được và mật khẩu mới hoạt động.
it('completes OTP recovery over HTTP, rejects token reuse and revokes the old access and refresh tokens', async () => {
  const [account] = accounts;
  await login(account);
  const requested = await authService.forgotPassword({ email: account.email });
  expect(requested.success).toBe(true);
  const mail = transport.sendMail.mock.calls.at(-1)[0];
  const otp = /Mã xác minh:\s*(\d{6})/.exec(mail.text)[1];
  const verified = await authService.verifyPasswordResetOtp({ email: account.email, otp });
  const token = verified.data.token;
  expect(token).toHaveLength(64);
  expect((await authService.resetPassword({ token, newPassword: UPDATED_PASSWORD })).success).toBe(true);
  await expect(authService.resetPassword({ token, newPassword: UPDATED_PASSWORD })).rejects.toMatchObject({ status: 400, code: 'PASSWORD_RESET_TOKEN_INVALID' });
  await expect(authService.getMe()).rejects.toMatchObject({ status: 401 });
  expect(getSession()).toBeNull();
  await expect(authService.login({ email: account.email, password: ORIGINAL_PASSWORD })).rejects.toMatchObject({ status: 401 });
  await login(account, UPDATED_PASSWORD);
  expect((await authService.getMe()).data.user.user_id).toBe(account.user_id);
  expect((await apiClient.post('/auth/refresh')).data.userId).toBe(account.user_id);
});

// Access token hết hạn phải được refresh tự động rồi thử lại thao tác lưu hồ sơ trên đúng tài khoản.
it('refreshes an expired client token and retries the profile write against the same database account', async () => {
  const [account] = accounts;
  await login(account);
  expireAccess(account);
  const changedName = 'Profile saved after automatic refresh';
  const result = await authService.updateMe({ full_name: changedName });
  expect(result.data.user).toMatchObject({ user_id: account.user_id, full_name: changedName });
  expect(getSession().user.user_id).toBe(account.user_id);
  expect((await prisma.user.findUnique({ where: { user_id: account.user_id } })).full_name).toBe(changedName);
});

// Cookie refresh thuộc tài khoản tab khác phải bị từ chối (SESSION_IDENTITY_CHANGED) trước khi ghi hồ sơ,
// tránh ghi dữ liệu nhầm sang tài khoản khác.
it('rejects another tab account refresh cookie before a profile write reaches either account', async () => {
  const [first, second] = accounts;
  const firstSession = await login(first);
  await login(second);
  setSession({ token: firstSession.token, user: firstSession.user }, { remember: false });
  expireAccess(first);
  await expect(authService.updateMe({ full_name: 'Must never be saved to another account' })).rejects.toMatchObject({ status: 401, code: 'SESSION_IDENTITY_CHANGED' });
  expect(getSession()).toBeNull();
  const persisted = await prisma.user.findMany({ where: { user_id: { in: [first.user_id, second.user_id] } }, orderBy: { user_id: 'asc' } });
  for (const original of accounts) {
    expect(persisted.find((account) => account.user_id === original.user_id).full_name).toBe(original.full_name);
  }
});
