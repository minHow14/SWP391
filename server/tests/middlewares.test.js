// d:\Projects\FPT\SWP391\server\tests\middlewares.test.js
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { generateToken } from '../src/utils/jwt.js';

describe('Core Security & Utility Middlewares', () => {
  const userToken = generateToken({ user_id: 2, role: 2, email: 'test@swp391.com' });

  it('Helmet sets security headers and removes X-Powered-By', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('Global RequestId assigns X-Request-Id header to every response', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(/^req_[a-f0-9]{12}$/);
  });

  it('RequestId preserves incoming X-Request-Id if sent by client', async () => {
    const customId = 'client-trace-12345';
    const res = await request(app).get('/health').set('X-Request-Id', customId);
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(customId);
  });

  it('Upload endpoint rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/upload/avatar');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Upload endpoint rejects requests without file', async () => {
    const res = await request(app)
      .post('/api/upload/avatar')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('Upload endpoint accepts valid image files and returns relative path', async () => {
    const dummyImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .post('/api/upload/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('avatar', dummyImageBuffer, 'sample.png');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toMatch(/^\/uploads\/avatars\/[a-f0-9-]+\.png$/);
  });

  it('Upload endpoint rejects non-image files', async () => {
    const dummyTextBuffer = Buffer.from('Malicious script content');

    const res = await request(app)
      .post('/api/upload/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('avatar', dummyTextBuffer, 'script.exe');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
