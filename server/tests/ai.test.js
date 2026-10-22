// d:\Projects\FPT\SWP391\server\tests\ai.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { generateToken } from '../src/utils/jwt.js';
import { ROLES } from '../src/constants/roles.js';

describe('AI Gateway & Admin Management API Boundary', () => {
  const adminToken = generateToken({ user_id: 1, role: ROLES.ADMIN });
  const userToken = generateToken({ user_id: 2, role: ROLES.USER });

  it('GET /api/ai/usage returns guest quota for unauthenticated requests with X-Guest-Id', async () => {
    const res = await request(app)
      .get('/api/ai/usage')
      .set('X-Guest-Id', 'test-vitest-guest-001');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.daily_limit).toBe(3);
    expect(res.body.data.guest_id).toBe('test-vitest-guest-001');
    expect(res.body.data.is_authenticated).toBe(false);
    expect(typeof res.body.data.remaining).toBe('number');
  });

  it('GET /api/ai/usage recognizes authenticated user and returns unlimited quota', async () => {
    const res = await request(app)
      .get('/api/ai/usage')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.is_authenticated).toBe(true);
    expect(res.body.data.daily_limit).toBe(999);
    expect(res.body.data.remaining).toBe(999);
  });

  it('GET /api/admin/ai/stats rejects non-admin users with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/ai/stats')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('FORBIDDEN');
  });

  it('GET /api/admin/ai/stats returns comprehensive AI metrics for Admin', async () => {
    const res = await request(app)
      .get('/api/admin/ai/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.by_day)).toBe(true);
    expect(Array.isArray(res.body.data.by_feature)).toBe(true);
    expect(Array.isArray(res.body.data.by_model)).toBe(true);
  });

  it('POST /api/admin/ai/guest-quota/reset successfully resets guest quota for Admin', async () => {
    const res = await request(app)
      .post('/api/admin/ai/guest-quota/reset')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ guest_id: 'test-vitest-guest-001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.guestId).toBe('test-vitest-guest-001');
    expect(res.body.data.used).toBe(0);
  });
});
