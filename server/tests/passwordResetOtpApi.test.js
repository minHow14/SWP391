// D:/SWP391/SWP391/server/tests/passwordResetOtpApi.test.js
import { createHash, randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import nodemailer from 'nodemailer';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import prisma from '../src/config/prisma.js';
import passwordResetRoutes from '../src/routes/passwordResetRoutes.js';
import { globalErrorHandler } from '../src/middlewares/errorMiddleware.js';
import { comparePassword, hashPassword } from '../src/utils/jwt.js';

vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn() } }));
const transport = { verify: vi.fn(), sendMail: vi.fn() };
const app = express();
app.use(express.json());
app.use('/auth', passwordResetRoutes);
app.use(globalErrorHandler);
const forgot = (email) => request(app).post('/auth/forgot-password').send({ email });
const verify = (email, otp) => request(app).post('/auth/verify-password-reset-otp').send({ email, otp });
const reset = (token) => request(app).post('/auth/reset-password').send({ token, newPassword: 'Changed-with-OTP-93' });
const digest = (token) => createHash('sha256').update(token).digest('hex');
const mailedOtp = () => /Mã xác minh:\s*(\d{6})/.exec(transport.sendMail.mock.calls.at(-1)[0].text)?.[1];
let user;
let originalHash;

beforeAll(async () => {
  originalHash = await hashPassword('Original-OTP-password-42');
  user = await prisma.user.create({ data: {
    email: `otp-${randomUUID()}@example.invalid`, full_name: 'OTP recovery integration', password_hash: originalHash,
  } });
});
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv('SMTP_HOST', 'smtp.provider.invalid');
  vi.stubEnv('SMTP_PORT', '587'); vi.stubEnv('SMTP_SECURE', 'false');
  vi.stubEnv('SMTP_USER', 'smtp-account'); vi.stubEnv('SMTP_PASS', 'smtp-secret');
  vi.stubEnv('SMTP_FROM', 'support@example.invalid'); vi.stubEnv('CLIENT_URL', 'http://localhost:5173');
  nodemailer.createTransport.mockReturnValue(transport);
  transport.verify.mockResolvedValue(true);
  transport.sendMail.mockImplementation(async ({ to }) => ({ accepted: [to] }));
  if (prisma.passwordResetOtp) await prisma.passwordResetOtp.deleteMany({ where: { userId: user.user_id } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.user_id } });
  await prisma.user.update({ where: { user_id: user.user_id }, data: {
    status: 'ACTIVE', deleted_at: null, tokenVersion: 0, password_hash: originalHash,
  } });
});
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  if (user) await prisma.user.delete({ where: { user_id: user.user_id } });
  await prisma.$disconnect();
});

describe('email OTP password recovery', () => {
  it('emails six digits in HTML and text, without putting the OTP or a recovery link in the response', async () => {
    const known = await forgot(user.email.toUpperCase());
    const unknown = await forgot(`unknown-${randomUUID()}@example.invalid`);
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect(known.body.data).toEqual({ expiresInSeconds: 300, resendAfterSeconds: 60 });
    const otp = mailedOtp();
    expect(otp).toMatch(/^\d{6}$/);
    const mail = transport.sendMail.mock.calls[0][0];
    expect(mail.html).toContain(otp);
    expect(mail.html).toContain('ChayXanh');
    expect(mail.text).not.toContain('#token=');
    expect(JSON.stringify(known.body)).not.toContain(otp);
    const stored = await prisma.passwordResetOtp.findUnique({ where: { userId: user.user_id } });
    expect(stored.otpHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.otpHash).not.toBe(digest(otp));
    expect(stored.attempts).toBe(0);
    expect(stored.expiresAt.getTime() - stored.lastSentAt.getTime()).toBe(300000);
    expect(await prisma.passwordResetToken.count({ where: { userId: user.user_id } })).toBe(0);
    expect(known.headers['cache-control']).toBe('no-store');
  });
  it('verifies the OTP once, then resets the password and revokes the old sessions', async () => {
    await forgot(user.email);
    const otp = mailedOtp();
    const checked = await verify(user.email.toUpperCase(), otp);
    expect(checked.status).toBe(200);
    expect(checked.body.data).toMatchObject({ token: expect.stringMatching(/^[a-f0-9]{64}$/), expiresInSeconds: 300 });
    const token = checked.body.data.token;
    const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash: digest(token) } });
    expect(stored).toMatchObject({ userId: user.user_id, tokenVersion: 0 });
    expect(stored.expiresAt.getTime() - Date.now()).toBeGreaterThan(290000);
    expect((await verify(user.email, otp)).body.errorCode).toBe('PASSWORD_RESET_OTP_INVALID');
    expect((await reset(token)).status).toBe(200);
    expect((await reset(token)).body.errorCode).toBe('PASSWORD_RESET_TOKEN_INVALID');
    const updated = await prisma.user.findUnique({ where: { user_id: user.user_id } });
    expect(updated.tokenVersion).toBe(1);
    expect(await comparePassword('Changed-with-OTP-93', updated.password_hash)).toBe(true);
    expect(checked.headers['cache-control']).toBe('no-store');
  });
  it('persists five failed guesses and blocks the correct OTP after the fifth failure', async () => {
    await forgot(user.email);
    const otp = mailedOtp();
    const wrong = otp === '000000' ? '111111' : '000000';
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = await verify(user.email, wrong);
      expect(result.status).toBe(400);
      expect(result.body.errorCode).toBe('PASSWORD_RESET_OTP_INVALID');
      expect((await prisma.passwordResetOtp.findUnique({ where: { userId: user.user_id } })).attempts).toBe(attempt);
    }
    expect((await verify(user.email, otp)).status).toBe(400);
    expect(await prisma.passwordResetToken.count({ where: { userId: user.user_id } })).toBe(0);
  });
  it('keeps cooldown responses generic and sends only one email for concurrent requests', async () => {
    const results = await Promise.all([forgot(user.email), forgot(user.email)]);
    const repeated = await forgot(user.email);
    const unknown = await forgot('unknown@example.invalid');
    expect(results.every((result) => result.status === 200)).toBe(true);
    expect(results[0].body).toEqual(results[1].body);
    expect(repeated.body).toEqual(unknown.body);
    expect(transport.sendMail).toHaveBeenCalledOnce();
    expect(await prisma.passwordResetOtp.count({ where: { userId: user.user_id } })).toBe(1);
  });
  it('resending after sixty seconds resets attempts and invalidates the old OTP and reset permissions', async () => {
    await forgot(user.email);
    const oldOtp = mailedOtp();
    const oldGrant = (await verify(user.email, oldOtp)).body.data.token;
    await prisma.passwordResetOtp.update({ where: { userId: user.user_id }, data: { lastSentAt: new Date(Date.now() - 61000) } });
    expect((await forgot(user.email)).status).toBe(200);
    const newOtp = mailedOtp();
    expect(transport.sendMail).toHaveBeenCalledTimes(2);
    expect((await reset(oldGrant)).body.errorCode).toBe('PASSWORD_RESET_TOKEN_INVALID');
    if (newOtp !== oldOtp) expect((await verify(user.email, oldOtp)).status).toBe(400);
    expect((await verify(user.email, newOtp)).status).toBe(200);
  });
  it.each(['expired', 'locked', 'deleted', 'old password version', 'consumed'])('rejects an %s challenge without issuing reset permission', async (state) => {
    await forgot(user.email);
    const otp = mailedOtp();
    if (state === 'expired') await prisma.passwordResetOtp.update({ where: { userId: user.user_id }, data: { expiresAt: new Date(0) } });
    if (state === 'consumed') await prisma.passwordResetOtp.update({ where: { userId: user.user_id }, data: { consumedAt: new Date() } });
    if (state === 'locked') await prisma.user.update({ where: { user_id: user.user_id }, data: { status: 'LOCKED' } });
    if (state === 'deleted') await prisma.user.update({ where: { user_id: user.user_id }, data: { deleted_at: new Date() } });
    if (state === 'old password version') await prisma.user.update({ where: { user_id: user.user_id }, data: { tokenVersion: 1 } });
    const result = await verify(user.email, otp);
    const unknown = await verify('unknown@example.invalid', otp);
    expect(result.status).toBe(400);
    expect(result.body).toEqual(unknown.body);
    expect(await prisma.passwordResetToken.count({ where: { userId: user.user_id } })).toBe(0);
  });
  it('allows exactly one of two concurrent verifications to issue a reset permission', async () => {
    await forgot(user.email);
    const otp = mailedOtp();
    const results = await Promise.all([verify(user.email, otp), verify(user.email, otp)]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
    expect(await prisma.passwordResetToken.count({ where: { userId: user.user_id } })).toBe(1);
  });
  it('never loses increments when five incorrect verifications arrive concurrently', async () => {
    await forgot(user.email);
    const otp = mailedOtp();
    const wrong = otp === '000000' ? '111111' : '000000';
    const results = await Promise.all(Array.from({ length: 5 }, () => verify(user.email, wrong)));
    expect(results.every((result) => result.status === 400)).toBe(true);
    expect((await prisma.passwordResetOtp.findUnique({ where: { userId: user.user_id } })).attempts).toBe(5);
    expect((await verify(user.email, otp)).status).toBe(400);
  });
  it('makes an undelivered code unusable while preserving the generic request response and resend cooldown', async () => {
    transport.sendMail.mockRejectedValueOnce(new Error('private SMTP response'));
    const result = await forgot(user.email);
    expect(result.body).toEqual((await forgot('unknown@example.invalid')).body);
    const otp = mailedOtp();
    expect((await verify(user.email, otp)).status).toBe(400);
    await forgot(user.email);
    expect(transport.sendMail).toHaveBeenCalledOnce();
  });
  it('rolls back OTP consumption if creating reset permission fails', async () => {
    await forgot(user.email);
    const otp = mailedOtp();
    const { passwordResetRepository } = await import('../src/repositories/passwordResetRepository.js');
    const failure = vi.spyOn(passwordResetRepository, 'createToken').mockRejectedValueOnce(new Error('forced grant failure'));
    try {
      expect((await verify(user.email, otp)).status).toBe(500);
      expect((await prisma.passwordResetOtp.findUnique({ where: { userId: user.user_id } })).consumedAt).toBeNull();
    } finally { failure.mockRestore(); }
    expect((await verify(user.email, otp)).status).toBe(200);
  });
  it.each(['', '12345', '1234567', 'abcdef', 123456])('rejects malformed OTP %s before changing challenge state', async (otp) => {
    await forgot(user.email);
    expect((await verify(user.email, otp)).status).toBe(400);
    expect((await prisma.passwordResetOtp.findUnique({ where: { userId: user.user_id } })).attempts).toBe(0);
  });
});
