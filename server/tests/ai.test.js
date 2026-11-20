// D:/SWP391/SWP391/server/tests/ai.test.js
// Kiểm thử ranh giới API của AI gateway (hạn mức khách/thành viên) và API quản trị AI cho admin.
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { generateToken } from '../src/utils/jwt.js';
import { ROLES } from '../src/constants/roles.js';
import prisma from '../src/config/prisma.js';
import { createGuestSession } from './helpers/guestSession.js';

// Tạo phiên khách trước khi chạy; dọn hạn mức khách và đóng DB khi xong.
let guestSession;
beforeAll(async () => { guestSession = await createGuestSession(app); });
afterAll(async () => {
  await prisma.guestQuota.deleteMany({ where: { guestId: guestSession.guestId } });
  await prisma.$disconnect();
});

// Nhóm test: API AI gateway và quản trị AI.
describe('AI Gateway & Admin Management API Boundary', () => {
  const adminToken = generateToken({ user_id: 1, role: ROLES.ADMIN });
  const userToken = generateToken({ user_id: 2, role: ROLES.USER });

  // Khách được nhận diện bằng cookie đã ký; header X-Guest-Id do client tự gửi phải bị bỏ qua để chống giả mạo hạn mức.
  it('GET /api/ai/usage uses the signed cookie and ignores X-Guest-Id', async () => {
    const res = await guestSession.agent
      .get('/api/ai/usage')
      .set('X-Guest-Id', 'test-vitest-guest-001');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.dailyLimit).toBe(3);
    expect(res.body.data.guestId).toBe(guestSession.guestId);
    expect(res.body.data.isAuthenticated).toBe(false);
    expect(typeof res.body.data.remaining).toBe('number');
  });

  // Thành viên đã đăng nhập không bị giới hạn lượt dùng AI.
  it('GET /api/ai/usage recognizes authenticated user and returns unlimited quota', async () => {
    const res = await request(app)
      .get('/api/ai/usage')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isAuthenticated).toBe(true);
    expect(res.body.data.dailyLimit).toBeNull();
    expect(res.body.data.unlimited).toBe(true);
    expect(res.body.data.remaining).toBeNull();
  });

  // Người dùng thường truy cập thống kê AI của admin phải nhận 403 FORBIDDEN.
  it('GET /api/admin/ai/stats rejects non-admin users with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/ai/stats')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('FORBIDDEN');
  });

  // Admin nhận đủ thống kê AI theo ngày, tính năng và mô hình.
  it('GET /api/admin/ai/stats returns comprehensive AI metrics for Admin', async () => {
    const res = await request(app)
      .get('/api/admin/ai/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.byDay)).toBe(true);
    expect(Array.isArray(res.body.data.byFeature)).toBe(true);
    expect(Array.isArray(res.body.data.byModel)).toBe(true);
  });

  // Admin reset được hạn mức của khách về 0.
  it('POST /api/admin/ai/guest-quota/reset successfully resets guest quota for Admin', async () => {
    const res = await request(app)
      .post('/api/admin/ai/guest-quota/reset')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ guestId: guestSession.guestId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.guestId).toBe(guestSession.guestId);
    expect(res.body.data.used).toBe(0);
  });
});
