// D:/SWP391/SWP391/server/tests/tokenVersion.test.js
// Kiểm thử tích hợp (cần DB test) cơ chế tokenVersion: thu hồi JWT cũ khi đổi/đặt lại mật khẩu hoặc khóa tài khoản.
import './loadTestEnvironment.js';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken, generateRefreshToken, hashPassword, verifyToken } from '../src/utils/jwt.js';
import { userRepository } from '../src/repositories/user.repository.js';

// User test, mật khẩu gốc và hàm tạo header Authorization dùng chung.
let user;
const PASSWORD = 'OriginalPassword123!';
const header = (token) => ({ Authorization: `Bearer ${token}` });
// Tạo user mới cho mỗi test để trạng thái tokenVersion luôn sạch.
beforeEach(async () => {
  user = await prisma.user.create({ data: { email: `token-version-${randomUUID()}@example.invalid`,
    full_name: 'Authentication version regression', password_hash: await hashPassword(PASSWORD) } });
});
// Khôi phục spy và xóa user sau mỗi test; đóng kết nối DB khi xong.
afterEach(async () => { vi.restoreAllMocks(); if (user) await prisma.user.delete({ where: { user_id: user.user_id } }); });
afterAll(() => prisma.$disconnect());

// Nhóm test: thu hồi thông tin đăng nhập sau khi thay đổi mật khẩu.
describe('revoking credentials after password changes', () => {
  // Mô phỏng sự kiện đồng thời (reset mật khẩu, khóa, xóa tài khoản) xảy ra ngay sau khi đọc tài khoản:
  // yêu cầu đổi mật khẩu dựa trên dữ liệu cũ phải bị từ chối 409 và không ghi đè mật khẩu.
  it.each(['password reset', 'account lock', 'account deletion'])('rejects a stale password change after a concurrent %s', async (event) => {
    const readAccount = userRepository.findWithPasswordById.bind(userRepository);
    const resetHash = await hashPassword('IndependentReset123!');
    vi.spyOn(userRepository, 'findWithPasswordById').mockImplementationOnce(async (userId) => {
      const snapshot = await readAccount(userId);
      const mutation = event === 'password reset' ? { password_hash: resetHash, tokenVersion: 1 }
        : { status: event === 'account lock' ? 'LOCKED' : 'DELETED', deleted_at: event === 'account deletion' ? new Date() : null };
      await prisma.user.update({ where: { user_id: userId }, data: mutation });
      return snapshot;
    });
    const response = await request(app).post('/api/auth/change-password')
      .set(header(generateToken({ user_id: user.user_id, role: user.role })))
      .send({ currentPassword: PASSWORD, newPassword: 'StaleReplacement123!' });
    expect(response.status).toBe(409);
    expect(response.body.data?.token).toBeUndefined();
    const persisted = await prisma.user.findUnique({ where: { user_id: user.user_id } });
    expect(persisted.password_hash).toBe(event === 'password reset' ? resetHash : user.password_hash);
  });

  // Access token và refresh token mang tokenVersion cũ phải bị từ chối 401 sau khi phiên bản tăng.
  it('rejects old access and refresh tokens after the account token version changes', async () => {
    const claims = { user_id: user.user_id, role: user.role, tokenVersion: 0 };
    const access = generateToken(claims);
    const refresh = generateRefreshToken(claims);
    await prisma.user.update({ where: { user_id: user.user_id }, data: { tokenVersion: 1 } });
    expect((await request(app).get('/api/auth/me').set(header(access))).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: refresh })).status).toBe(401);
  });

  // Đăng nhập và refresh phải cấp token mang tokenVersion hiện tại của tài khoản.
  it('issues the current version on login and refresh after a previous password reset', async () => {
    await prisma.user.update({ where: { user_id: user.user_id }, data: { tokenVersion: 2 } });
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    expect(login.status).toBe(200);
    expect(verifyToken(login.body.data.token).tokenVersion).toBe(2);
    expect((await request(app).get('/api/auth/me').set(header(login.body.data.token))).status).toBe(200);
    const refresh = await request(app).post('/api/auth/refresh').send({ refreshToken: login.body.data.refreshToken });
    expect(refresh.status).toBe(200);
    expect(refresh.body.data.userId).toBe(user.user_id);
    expect(verifyToken(refresh.body.data.token).tokenVersion).toBe(2);
  });

  // Đổi mật khẩu thành công phải tăng tokenVersion, vô hiệu token cũ và cấp token + cookie refresh mới cho phiên hiện tại.
  it('rotates the current session and invalidates older credentials when changing a known password', async () => {
    const old = generateToken({ user_id: user.user_id, role: user.role });
    const response = await request(app).post('/api/auth/change-password').set(header(old))
      .send({ currentPassword: PASSWORD, newPassword: 'ChangedPassword123!' });
    expect(response.status).toBe(200);
    expect((await prisma.user.findUnique({ where: { user_id: user.user_id } })).tokenVersion).toBe(1);
    expect((await request(app).get('/api/auth/me').set(header(old))).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(header(response.body.data.token))).status).toBe(200);
    expect(response.headers['set-cookie'].join(';')).toContain('refreshToken=');
  });
});
