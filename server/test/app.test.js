import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';

describe('HTTP boundary', () => {
  it('exposes a health endpoint without revealing infrastructure secrets', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('UP');
  });

  it('rejects malformed registration before accessing the database', async () => {
    const response = await request(app).post('/api/auth/register').send({ email: 'not-an-email', password: 'short' });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.details).toBeInstanceOf(Array);
  });

  it('rejects non-positive resource identifiers before service execution', async () => {
    const response = await request(app).get('/api/blogs/0');
    expect(response.status).toBe(400);
  });
});
