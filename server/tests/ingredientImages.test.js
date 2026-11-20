// Kiểm thử endpoint công khai phục vụ ảnh nguyên liệu lưu dạng nhị phân trong DB.
import { test, expect, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

// Khôi phục các spy Prisma sau mỗi test.
afterEach(() => vi.restoreAllMocks());

// Ảnh phải trả đúng byte, đúng MIME, có cache-control và ETag; gửi lại If-None-Match phải nhận 304 để tiết kiệm băng thông.
test('public image endpoint serves stored binary bytes with the correct MIME type and ETag', async () => {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ mime_type: 'image/jpeg', image_data: bytes }]);
  const response = await request(app).get('/api/workspace/ingredients/1/image');
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toContain('image/jpeg');
  expect(response.body).toEqual(bytes);
  expect(response.headers['cache-control']).toContain('max-age=86400');
  const cached = await request(app).get('/api/workspace/ingredients/1/image').set('If-None-Match', response.headers.etag);
  expect(cached.status).toBe(304);
});

// ID không hợp lệ phải bị chặn 400 trước khi truy vấn DB.
test('image endpoint rejects invalid IDs before querying the database', async () => {
  const query = vi.spyOn(prisma, '$queryRaw');
  expect((await request(app).get('/api/workspace/ingredients/0/image')).status).toBe(400);
  expect(query).not.toHaveBeenCalled();
});

// Không có ảnh phải trả 404 rõ ràng theo định dạng lỗi chung.
test('missing images return a clear 404 response', async () => {
  vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]);
  const response = await request(app).get('/api/workspace/ingredients/999/image');
  expect(response.status).toBe(404);
  expect(response.body.success).toBe(false);
});
