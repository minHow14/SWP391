// d:\Projects\FPT\SWP391\server\tests\middlewares.test.js
// Kiểm thử các middleware bảo mật và tiện ích dùng chung: Helmet, Request ID và upload ảnh đại diện.
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { generateToken } from '../src/utils/jwt.js';

// Nhóm test: middleware lõi về bảo mật và tiện ích.
describe('Core Security & Utility Middlewares', () => {
  const userToken = generateToken({ user_id: 2, role: 2, email: 'test@swp391.com' });

  // Helmet phải ẩn X-Powered-By và thêm header bảo mật; CORP cross-origin để FE khác origin tải được ảnh.
  it('Helmet sets security headers and removes X-Powered-By', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  // Mọi response phải có X-Request-Id dạng req_<12 hex> để truy vết log.
  it('Global RequestId assigns X-Request-Id header to every response', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(/^req_[a-f0-9]{12}$/);
  });

  // Giữ nguyên X-Request-Id do client gửi để nối chuỗi truy vết xuyên hệ thống.
  it('RequestId preserves incoming X-Request-Id if sent by client', async () => {
    const customId = 'client-trace-12345';
    const res = await request(app).get('/health').set('X-Request-Id', customId);
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(customId);
  });

  // Upload ảnh đại diện yêu cầu đăng nhập.
  it('Upload endpoint rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/upload/avatar');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // Thiếu file phải trả 400.
  it('Upload endpoint rejects requests without file', async () => {
    const res = await request(app)
      .post('/api/upload/avatar')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Ảnh PNG hợp lệ (1x1 pixel mã hóa base64) phải được lưu và trả về đường dẫn tương đối với tên file UUID.
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

  // File không phải ảnh (ví dụ .exe) phải bị từ chối để chặn upload mã độc.
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
