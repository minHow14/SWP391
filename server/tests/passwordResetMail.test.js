// D:/SWP391/SWP391/server/tests/passwordResetMail.test.js
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { mailService } from '../src/services/mailService.js';

vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn() } }));
const transport = { verify: vi.fn(), sendMail: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SMTP_HOST', 'smtp.provider.invalid');
  vi.stubEnv('SMTP_PORT', '587');
  vi.stubEnv('SMTP_SECURE', 'false');
  vi.stubEnv('SMTP_USER', 'smtp-account');
  vi.stubEnv('SMTP_PASS', 'smtp-secret');
  vi.stubEnv('SMTP_FROM', 'support@example.invalid');
  vi.stubEnv('CLIENT_URL', 'http://localhost:5173');
  vi.stubEnv('PASSWORD_RESET_TTL_MINUTES', '15');
  transport.verify.mockResolvedValue(true);
  transport.sendMail.mockResolvedValue({ accepted: ['member@example.invalid'], rejected: [] });
  nodemailer.createTransport.mockReturnValue(transport);
});
afterEach(() => vi.unstubAllEnvs());

it('uses authenticated SMTP with verified TLS and bounded timeouts, then sends a real plain-text reset link', async () => {
  const delivery = await mailService.ensureAvailable();
  expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
    host: 'smtp.provider.invalid', port: 587, secure: false, requireTLS: true,
    auth: { user: 'smtp-account', pass: 'smtp-secret' }, connectionTimeout: 10000, socketTimeout: 10000,
    disableFileAccess: true, disableUrlAccess: true,
  }));
  expect(transport.verify).toHaveBeenCalledOnce();
  await mailService.sendPasswordReset({ delivery, to: 'member@example.invalid', resetUrl: 'http://localhost:5173/dat-lai-mat-khau#token=private' });
  expect(transport.sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: 'support@example.invalid', to: 'member@example.invalid', text: expect.stringContaining('#token=private') }));
});
it('allows implicit TLS for SMTP port 465', async () => {
  vi.stubEnv('SMTP_SECURE', 'true'); vi.stubEnv('SMTP_PORT', '465');
  await mailService.ensureAvailable();
  expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: true, port: 465 }));
});
it.each(['missing', 'invalid port', 'invalid sender', 'bad client URL', 'SMTP unavailable'])('returns a sanitized 503 for %s without leaking mail credentials', async (scenario) => {
  if (scenario === 'missing') vi.stubEnv('SMTP_PASS', '');
  if (scenario === 'invalid port') vi.stubEnv('SMTP_PORT', '70000');
  if (scenario === 'invalid sender') vi.stubEnv('SMTP_FROM', 'invalid\r\nBcc: stranger@example.invalid');
  if (scenario === 'bad client URL') vi.stubEnv('CLIENT_URL', 'javascript:alert(1)');
  if (scenario === 'SMTP unavailable') transport.verify.mockRejectedValue(new Error('smtp-secret provider failure'));
  await expect(mailService.ensureAvailable()).rejects.toMatchObject({ statusCode: 503, errorCode: 'PASSWORD_RESET_UNAVAILABLE' });
});
it('rejects an SMTP result that accepted no recipient', async () => {
  const delivery = await mailService.ensureAvailable();
  transport.sendMail.mockResolvedValue({ accepted: [], rejected: ['member@example.invalid'] });
  await expect(mailService.sendPasswordReset({ delivery, to: 'member@example.invalid', resetUrl: 'http://localhost:5173/#token=private' })).rejects.toBeTruthy();
});
