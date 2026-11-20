// D:/SWP391/SWP391/server/tests/passwordResetApi.test.js
// Kiểm thử tích hợp (cần DB test) API khôi phục mật khẩu: chống dò email, OTP, token một lần và tính nguyên tử.
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import prisma from '../src/config/prisma.js';
import passwordResetRoutes from '../src/routes/passwordResetRoutes.js';
import { globalErrorHandler } from '../src/middlewares/errorMiddleware.js';
import { comparePassword, hashPassword } from '../src/utils/jwt.js';

// Mock nodemailer và dựng app Express tối giản chỉ gồm route đặt lại mật khẩu cùng error handler chung.
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
// Băm SHA-256 token giống cách server lưu trong DB.
const digest = (token) => createHash('sha256').update(token).digest('hex');
// Tạo trực tiếp token đặt lại mật khẩu trong DB (còn hạn) và trả về token gốc.
// @param patch các trường ghi đè (hết hạn, đã dùng...)
async function seedToken(patch = {}) {
  const token = randomBytes(32).toString('hex');
  await prisma.passwordResetToken.create({ data: {
    userId: user.user_id, tokenVersion: 0, tokenHash: digest(token), expiresAt: new Date(Date.now() + 60000), ...patch,
  } });
  return token;
}
// Tạo user test với mật khẩu gốc đã băm.
beforeAll(async () => {
  originalHash = await hashPassword('Original-password-42');
  user = await prisma.user.create({ data: {
    email: `password-reset-${randomUUID()}@example.invalid`, full_name: 'Password reset integration', password_hash: originalHash,
  } });
});
// Trước mỗi test: cấu hình SMTP giả, xóa OTP/token cũ và khôi phục trạng thái user ban đầu.
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv('SMTP_HOST', 'smtp.provider.invalid');
  vi.stubEnv('SMTP_PORT', '587'); vi.stubEnv('SMTP_SECURE', 'false');
  vi.stubEnv('SMTP_USER', 'smtp-account'); vi.stubEnv('SMTP_PASS', 'smtp-secret');
  vi.stubEnv('SMTP_FROM', 'support@example.invalid'); vi.stubEnv('CLIENT_URL', 'http://localhost:5173');
  vi.stubEnv('PASSWORD_RESET_TTL_MINUTES', '15');
  await prisma.passwordResetOtp.deleteMany({ where: { userId: user.user_id } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.user_id } });
  await prisma.user.update({ where: { user_id: user.user_id }, data: { password_hash: originalHash, tokenVersion: 0, status: 'ACTIVE', deleted_at: null } });
  transport.verify.mockResolvedValue(true);
  transport.sendMail.mockImplementation(async ({ to }) => ({ accepted: [to], rejected: [] }));
  nodemailer.createTransport.mockReturnValue(transport);
});
// Gỡ biến môi trường đã stub; xóa user và đóng DB khi xong.
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  if (user) await prisma.user.delete({ where: { user_id: user.user_id } });
  await prisma.$disconnect();
});

// Nhóm test: hợp đồng HTTP và DB của khôi phục mật khẩu.
describe('password recovery HTTP and database contract', () => {
  // Phản hồi cho email có/không tồn tại phải giống hệt (chống dò tài khoản); gửi OTP thay vì link chứa token,
  // OTP không xuất hiện trong response và response không được cache.
  it('keeps known/unknown responses identical and issues an OTP instead of emailing reset permission', async () => {
    const known = await forgot(user.email.toUpperCase());
    const unknown = await forgot(`unknown-${randomUUID()}@example.invalid`);
    expect(known.status).toBe(200); expect(unknown.body).toEqual(known.body);
    expect(known.body).toMatchObject({ success: true, data: { expiresInSeconds: 300, resendAfterSeconds: 60 } });
    expect(transport.sendMail).toHaveBeenCalledOnce();
    const emailText = transport.sendMail.mock.calls[0][0].text;
    const otp = /Mã xác minh:\s*(\d{6})/.exec(emailText)[1];
    expect(emailText).not.toContain('#token=');
    expect(JSON.stringify(known.body)).not.toContain(otp);
    expect(await prisma.passwordResetToken.count({ where: { userId: user.user_id } })).toBe(0);
    expect(known.headers['cache-control']).toBe('no-store');
  });
  // Tài khoản bị khóa hoặc đã xóa không được nhận mã khôi phục.
  it.each(['LOCKED', 'DELETED'])('does not issue recovery tokens for a %s account', async (status) => {
    await prisma.user.update({ where: { user_id: user.user_id }, data: { status } });
    const result = await forgot(user.email);
    expect(result.status).toBe(200);
    expect(transport.sendMail).not.toHaveBeenCalled();
    expect(await prisma.passwordResetToken.count({ where: { userId: user.user_id } })).toBe(0);
  });
  // SMTP chưa cấu hình thì mọi địa chỉ đều nhận cùng lỗi 503 rõ ràng.
  it('returns the same clear 503 for every address when SMTP is unconfigured', async () => {
    vi.stubEnv('SMTP_HOST', '');
    const known = await forgot(user.email);
    const unknown = await forgot('unregistered@example.invalid');
    expect(known.status).toBe(503); expect(unknown.body).toEqual(known.body);
    expect(known.body.errorCode).toBe('PASSWORD_RESET_UNAVAILABLE');
    expect(await prisma.passwordResetToken.count({ where: { userId: user.user_id } })).toBe(0);
  });
  // SMTP từ chối gửi thì thu hồi token, phản hồi vẫn chung chung và không lộ bí mật SMTP.
  it('revokes tokens rejected by SMTP without changing the generic accepted response', async () => {
    transport.sendMail.mockRejectedValue(new Error('provider rejected smtp-secret recipient'));
    const result = await forgot(user.email);
    const unknown = await forgot('unregistered@example.invalid');
    expect(result.body).toEqual(unknown.body);
    expect(await prisma.passwordResetToken.count({ where: { userId: user.user_id } })).toBe(0);
    expect(JSON.stringify(result.body)).not.toContain('smtp-secret');
  });
  // Đặt lại thành công: đổi mật khẩu, xóa cookie refresh, tăng tokenVersion và vô hiệu mọi token khác; không dùng lại được.
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
  // Link thiếu, hết hạn, đã dùng, tài khoản khóa/xóa hoặc tokenVersion cũ đều trả cùng một lỗi và giữ nguyên mật khẩu.
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
  // Hai yêu cầu đồng thời dùng cùng token: chỉ một yêu cầu thành công.
  it('permits only one of two concurrent redemptions of the same token', async () => {
    const token = await seedToken();
    const results = await Promise.all([reset(token, 'Concurrent-password-1'), reset(token, 'Concurrent-password-2')]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
    const updated = await prisma.user.findUnique({ where: { user_id: user.user_id } });
    expect(updated.tokenVersion).toBe(1);
  });
  // Hai token khác nhau của cùng user dùng đồng thời: được tuần tự hóa nên chỉ một mật khẩu thắng.
  it('serializes concurrent distinct links for the same user so only one password wins', async () => {
    const tokens = await Promise.all([seedToken(), seedToken()]);
    const results = await Promise.all(tokens.map((token, index) => reset(token, `Different-password-${index}`)));
    expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
    expect((await prisma.user.findUnique({ where: { user_id: user.user_id } })).tokenVersion).toBe(1);
  });
  // Vô hiệu phiên thất bại thì rollback cả việc đánh dấu token và đổi mật khẩu.
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
  // Mật khẩu vượt giới hạn 72 byte UTF-8 của bcrypt bị từ chối thay vì bị cắt ngầm.
  it('rejects passwords beyond bcrypt UTF-8 byte capacity instead of silently truncating them', async () => {
    const token = await seedToken();
    const result = await reset(token, '🔒'.repeat(20));
    expect(result.status).toBe(400);
    expect(result.body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'newPassword' })]));
    expect((await prisma.passwordResetToken.findUnique({ where: { tokenHash: digest(token) } })).consumedAt).toBeNull();
  });
  // Dữ liệu sai định dạng hoặc thừa trường bị 400 mà không tạo/tiêu thụ token.
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
