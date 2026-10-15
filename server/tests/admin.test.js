// d:\Projects\FPT\SWP391\server\tests\admin.test.js
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { generateToken } from '../src/utils/jwt.js';

describe('Admin API & RBAC Boundary', () => {
  const adminToken = generateToken({ user_id: 1, role: 1 });
  const normalUserToken = generateToken({ user_id: 2, role: 2 });

  it('rejects unauthenticated requests to admin dashboard', async () => {
    const res = await request(app).get('/api/admin/dashboard/stats');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects non-admin users (Role 2) from accessing admin routes with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/stats')
      .set('Authorization', `Bearer ${normalUserToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows Admin (Role 1) to retrieve full dashboard statistics (FE-10)', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.members).toBeDefined();
    expect(res.body.data.content).toBeDefined();
    expect(res.body.data.ai).toBeDefined();
  });

  it('allows Admin to retrieve users list and paginate (FE-01)', async () => {
    const res = await request(app)
      .get('/api/admin/users?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.page).toBe(1);
  });

  it('allows Admin to fetch categories (FE-04)', async () => {
    const res = await request(app)
      .get('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('allows Admin to retrieve AI flagged content for moderation (FE-05)', async () => {
    const res = await request(app)
      .get('/api/admin/moderation/flagged')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.posts).toBeDefined();
    expect(res.body.data.comments).toBeDefined();
  });

  it('allows Admin to monitor AI models status (FE-06)', async () => {
    const res = await request(app)
      .get('/api/admin/ai/models')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
