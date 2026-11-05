// D:/SWP391/SWP391/server/tests/passwordResetApi.test.js
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
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
const reset = (token, newPassword = 'Updated-password-94') => request(app).post('/auth/reset-password').send({ token, newPassword });
let user;
let originalHash;
const digest = (token) => createHash('sha256').update(token).digest('hex');
async function seedToken(patch = {}) {
  const token = randomBytes(32).toString('hex');
  await prisma.passwordResetToken.create({ data: {
    userId: user.user_id, tokenVersion: 0, tokenHash: digest(token), expiresAt: new Date(Date.now() + 60000), ...patch,
  } });
  return token;
}
beforeAll(async () => {
  originalHash = await hashPassword('Original-password-42');
  user = await prisma.user.create({ data: {
    email: `password-reset-${randomUUID()}@example.invalid`, full_name: 'Password reset integration', password_hash: originalHash,
  } });
});
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv('SMTP_HOST', 'smtp.provider.invalid');
  vi.stubEnv('SMTP_PORT', '587'); vi.stubEnv('SMTP_SECURE', 'false');
  vi.stubEnv('SMTP_USER', 'smtp-account'); vi.stubEnv('SMTP_PASS', 'smtp-secret');
  vi.stubEnv('SMTP_FROM', 'support@example.invalid'); vi.stubEnv('CLIENT_URL', 'http://localhost:5173');
  vi.stubEnv('PASSWORD_RESET_TTL_MINUTES', '15');
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.user_id } });
  await prisma.user.update({ where: { user_id: user.user_id }, data: { password_hash: originalHash, tokenVersion: 0, status: 'ACTIVE', deleted_at: null } });
  transport.verify.mockResolvedValue(true);
  transport.sendMail.mockImplementation(async ({ to }) => ({ accepted: [to], rejected: [] }));
  nodemailer.createTransport.mockReturnValue(transport);
});
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  if (user) await prisma.user.delete({ where: { user_id: user.user_id } });
  await prisma.$disconnect();
});

describe('password recovery HTTP and database contract', () => {
  it('keeps known/unknown responses identical and stores only the hash of the emailed token', async () => {
    const known = await forgot(user.email.toUpperCase());
    const unknown = await forgot(`unknown-${randomUUID()}@example.invalid`);
    expect(known.status).toBe(200); expect(unknown.body).toEqual(known.body);
    expect(known.body).toMatchObject({ success: true, data: {} });
    expect(transport.sendMail).toHaveBeenCalledOnce();
    const emailText = transport.sendMail.mock.calls[0][0].text;
    const rawToken = /#token=([a-f0-9]{64})/.exec(emailText)[1];
    const stored = await prisma.passwordResetToken.findMany({ where: { userId: user.user_id } });
    expect(stored).toHaveLength(1);
    expect(stored[0].tokenHash).toBe(digest(rawToken));
    expect(JSON.stringify(stored)).not.toContain(rawToken);
    expect(JSON.stringify(known.body)).not.toContain(rawToken);
    expect(known.headers['cache-control']).toBe('no-store');
  });
  it.each(['LOCKED', 'DELETED'])('does not issue recovery tokens for a %s account', async (status) => {
    await prisma.user.update({ where: { user_id: user.user_id }, data: { status } });
    const result = await forgot(user.email);
    expect(result.status).toBe(200);
    expect(transport.sendMail).not.toHaveBeenCalled();
    expect(await prisma.passwordResetToken.count({ where: { userId: user.user_id } })).toBe(0);
  });
  it('returns the same clear 503 for every address when SMTP is unconfigured', async () => {
    vi.stubEnv('SMTP_HOST', '');
    const known = await forgot(user.email);
    const unknown = await forgot('unregistered@example.invalid');
    expect(known.status).toBe(503); expect(unknown.body).toEqual(known.body);
    expect(known.body.errorCode).toBe('PASSWORD_RESET_UNAVAILABLE');
    expect(await prisma.passwordResetToken.count({ where: { userId: user.user_id } })).toBe(0);
  });
  it('revokes tokens rejected by SMTP without changing the generic accepted response', async () => {
    transport.sendMail.mockRejectedValue(new Error('provider rejected smtp-secret recipient'));
    const result = await forgot(user.email);
    const unknown = await forgot('unregistered@example.invalid');
    expect(result.body).toEqual(unknown.body);
    expect(await prisma.passwordResetToken.count({ where: { userId: user.user_id } })).toBe(0);
    expect(JSON.stringify(result.body)).not.toContain('smtp-secret');
  });
  it('updates the password, invalidates sessions and all links, then refuses reuse', async () => {
    const token = await seedToken();
    const otherToken = await seedToken();
    const result = await reset(token);
    expect(result.status).toBe(200);
    expect(result.headers['set-cookie'][0]).toContain('refreshToken=;');
    const updated = await prisma.user.findUnique({ where: { user_id: user.user_id } });
    expect(await comparePassword('Updated-password-94', updated.password_hash)).toBe(true);
    expect(updated.tokenVersion).toBe(1);
    expect((await reset(token)).body.errorCode).toBe('PASSWORD_RESET_TOKEN_INVALID');
    expect((await reset(otherToken)).body.errorCode).toBe('PASSWORD_RESET_TOKEN_INVALID');
  });
  it.each(['missing', 'expired', 'used', 'locked', 'deleted', 'old password version'])('uses one rejection for a %s link and preserves the password', async (state) => {
    let token = randomBytes(32).toString('hex');
    if (state !== 'missing') token = await seedToken({
      ...(state === 'expired' ? { expiresAt: new Date(0) } : {}),
      ...(state === 'used' ? { consumedAt: new Date() } : {}),
    });
    if (state === 'locked') await prisma.user.update({ where: { user_id: user.user_id }, data: { status: 'LOCKED' } });
    if (state === 'deleted') await prisma.user.update({ where: { user_id: user.user_id }, data: { deleted_at: new Date() } });
    if (state === 'old password version') await prisma.user.update({ where: { user_id: user.user_id }, data: { tokenVersion: 1 } });
    const result = await reset(token);
    expect(result.status).toBe(400); expect(result.body.errorCode).toBe('PASSWORD_RESET_TOKEN_INVALID');
    expect((await prisma.user.findUnique({ where: { user_id: user.user_id } })).password_hash).toBe(originalHash);
  });
  it('permits only one of two concurrent redemptions of the same token', async () => {
    const token = await seedToken();
    const results = await Promise.all([reset(token, 'Concurrent-password-1'), reset(token, 'Concurrent-password-2')]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
    const updated = await prisma.user.findUnique({ where: { user_id: user.user_id } });
    expect(updated.tokenVersion).toBe(1);
  });
  it('serializes concurrent distinct links for the same user so only one password wins', async () => {
    const tokens = await Promise.all([seedToken(), seedToken()]);
    const results = await Promise.all(tokens.map((token, index) => reset(token, `Different-password-${index}`)));
    expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
    expect((await prisma.user.findUnique({ where: { user_id: user.user_id } })).tokenVersion).toBe(1);
  });
  it('rolls back consumption and password changes if session invalidation cannot finish', async () => {
    const token = await seedToken();
    const { passwordResetRepository } = await import('../src/repositories/passwordResetRepository.js');
    const fail = vi.spyOn(passwordResetRepository, 'invalidateUserTokens').mockRejectedValueOnce(new Error('forced rollback'));
    try {
      expect((await reset(token)).status).toBe(500);
      expect((await prisma.passwordResetToken.findUnique({ where: { tokenHash: digest(token) } })).consumedAt).toBeNull();
      expect((await prisma.user.findUnique({ where: { user_id: user.user_id } })).password_hash).toBe(originalHash);
    } finally { fail.mockRestore(); }
  });
  it('rejects passwords beyond bcrypt UTF-8 byte capacity instead of silently truncating them', async () => {
    const token = await seedToken();
    const result = await reset(token, '🔒'.repeat(20));
    expect(result.status).toBe(400);
    expect(result.body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'newPassword' })]));
    expect((await prisma.passwordResetToken.findUnique({ where: { tokenHash: digest(token) } })).consumedAt).toBeNull();
  });
  it.each([
    ['/forgot-password', { email: 'invalid-email' }],
    ['/forgot-password', { email: 'member@example.invalid', token: 'unexpected' }],
    ['/reset-password', { token: 'invalid', newPassword: 'valid-password' }],
    ['/reset-password', { token: 'a'.repeat(64), newPassword: 'short' }],
  ])('validates %s without creating or consuming tokens', async (path, body) => {
    expect((await request(app).post(`/auth${path}`).send(body)).status).toBe(400);
    expect(transport.sendMail).not.toHaveBeenCalled();
  });
});
