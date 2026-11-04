// D:/SWP391/SWP391/server/tests/frontendAuthIntegration.test.js
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
import { getPasswordResetToken } from '../../client/src/features/auth/utils/authValidation.js';

vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn() } }));
const transport = { verify: vi.fn().mockResolvedValue(true), sendMail: vi.fn() };
const originalBaseUrl = apiClient.defaults.baseURL;
const ORIGINAL_PASSWORD = 'Integration-original-password';
const UPDATED_PASSWORD = 'Integration-updated-password';
let server;
let accounts = [];
let originalHash;

async function login(account, password = ORIGINAL_PASSWORD) {
  const result = await authService.login({ email: account.email, password });
  // Node has no browser cookie jar; emulate only the browser's transport behavior.
  apiClient.defaults.headers.common.Cookie = `refreshToken=${result.data.refreshToken}`;
  setSession({ token: result.data.token, user: result.data.user }, { remember: false });
  return result.data;
}

function expireAccess(account) {
  const token = jwt.sign({ user_id: account.user_id, tokenVersion: account.tokenVersion }, process.env.JWT_SECRET, { expiresIn: -1 });
  setSession({ ...getSession(), token });
}

beforeAll(async () => {
  originalHash = await hashPassword(ORIGINAL_PASSWORD);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  apiClient.defaults.baseURL = `http://127.0.0.1:${server.address().port}/api`;
});

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

afterEach(async () => {
  setSession(null);
  delete apiClient.defaults.headers.common.Cookie;
  await prisma.user.deleteMany({ where: { user_id: { in: accounts.map((account) => account.user_id) } } });
  accounts = [];
  vi.unstubAllEnvs();
});

afterAll(async () => {
  apiClient.defaults.baseURL = originalBaseUrl;
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await prisma.$disconnect();
});

it('completes client recovery over HTTP, rejects link reuse and revokes the old access and refresh tokens', async () => {
  const [account] = accounts;
  await login(account);
  const requested = await authService.forgotPassword({ email: account.email });
  expect(requested.success).toBe(true);
  const mail = transport.sendMail.mock.calls.at(-1)[0];
  const resetUrl = new URL(mail.text.match(/http:\/\/localhost:5173\/dat-lai-mat-khau#token=[a-f0-9]{64}/)[0]);
  const token = getPasswordResetToken(resetUrl.hash);
  expect(resetUrl.search).toBe('');
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
