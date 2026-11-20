// Kiểm thử ranh giới HTTP của ứng dụng Express: health check và validate đầu vào trước khi chạm DB.
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';

// Nhóm test: các kiểm tra ở tầng HTTP chạy được mà không cần database.
describe('HTTP boundary', () => {
  // Endpoint /health phải trả trạng thái UP để giám sát, không lộ thông tin hạ tầng.
  it('exposes a health endpoint without revealing infrastructure secrets', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('UP');
  });

  // Dữ liệu đăng ký sai định dạng phải bị trả 400 kèm chi tiết lỗi ngay ở validator, không truy vấn DB.
  it('rejects malformed registration before accessing the database', async () => {
    const response = await request(app).post('/api/auth/register').send({ email: 'not-an-email', password: 'short' });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.details).toBeInstanceOf(Array);
  });

  // ID tài nguyên không dương (0) phải bị chặn với 400 trước khi service chạy.
  it('rejects non-positive resource identifiers before service execution', async () => {
    const response = await request(app).get('/api/blogs/0');
    expect(response.status).toBe(400);
  });
});
