// D:/SWP391/SWP391/server/tests/adminHealthApi.test.js
// Kiểm thử tích hợp (cần DB test có sẵn admin và thành viên) API tình trạng hệ thống của admin,
// dùng một HTTP server cục bộ giả làm AI Service.
import './loadTestEnvironment.js';
import { createServer } from 'node:http';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import request from 'supertest';

// Cấu hình AI có thể sửa (vi.hoisted) để trỏ tới server giả sau khi nó đã lắng nghe.
const config = vi.hoisted(() => ({ url: '', internalApiKey: 'health-test-only-key' }));
vi.mock('../src/config/aiConfig.js', () => ({ aiConfig: config }));

import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { healthRepository } from '../src/repositories/healthRepository.js';
import { aiLogRepository } from '../src/repositories/aiLogRepository.js';
import { userRepository } from '../src/repositories/user.repository.js';

// Server giả, token admin/thành viên, chế độ phản hồi của server giả và khóa nội bộ server nhận được.
let server, adminToken, memberToken, mode = 'healthy', receivedKey;
const endpoint = '/api/admin/system-health';
const authenticated = () => request(app).get(endpoint).set('Authorization', `Bearer ${adminToken}`);

// Lấy admin và thành viên có sẵn trong DB test, tạo token và khởi động server AI giả với các chế độ
// healthy / unavailable / invalid / hanging.
beforeAll(async () => {
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE', role: { in: [1, 2] }, deleted_at: null },
    select: { user_id: true, role: true }, orderBy: { user_id: 'asc' },
  });
  const admin = users.find((user) => user.role === 1), member = users.find((user) => user.role === 2);
  if (!admin || !member) throw new Error('The separate test DB needs active admin and member fixtures.');
  adminToken = generateToken({ user_id: admin.user_id });
  // Xác thực phải dựa vào role lưu trong DB kể cả khi token tự nhận là admin.
  memberToken = generateToken({ user_id: member.user_id, role: 1 });
  server = createServer((req, res) => {
    receivedKey = req.headers['x-internal-api-key'];
    res.setHeader('Content-Type', 'application/json');
    if (mode === 'hanging') { res.writeHead(200); res.flushHeaders(); return; }
    res.statusCode = mode === 'unavailable' ? 503 : 200;
    res.end(JSON.stringify(mode === 'invalid' ? { status: 'ok' } : { success: true, data: { status: 'ok' } }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  config.url = `http://127.0.0.1:${server.address().port}`;
});

// Đặt lại chế độ server giả và mock sau mỗi test; đóng server và DB khi xong.
afterEach(() => { mode = 'healthy'; receivedKey = undefined; vi.restoreAllMocks(); });
afterAll(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  await prisma.$disconnect();
});

// Yêu cầu ẩn danh hoặc token sai bị 401 trước khi chạy bất kỳ probe nào.
it('rejects anonymous and invalid-token requests before running probes', async () => {
  const probe = vi.spyOn(healthRepository, 'checkDatabase');
  expect((await request(app).get(endpoint)).status).toBe(401);
  expect((await request(app).get(endpoint).set('Authorization', 'Bearer invalid')).status).toBe(401);
  expect(probe).not.toHaveBeenCalled();
  expect(receivedKey).toBeUndefined();
});

// Thành viên bị 403 dù token ký hợp lệ tự nhận role admin (chống leo thang đặc quyền).
it('rejects a member even when the signed token claims an admin role', async () => {
  const response = await request(app).get(endpoint).set('Authorization', `Bearer ${memberToken}`);
  expect(response.status).toBe(403);
  expect(response.body.success).toBe(false);
  expect(receivedKey).toBeUndefined();
});

// Kiểm tra DB test thật và AI giả qua header nội bộ; khóa nội bộ không được xuất hiện trong response.
it('checks the real test DB and local AI HTTP fixture with the internal header', async () => {
  const response = await authenticated();
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ success: true, data: { status: 'HEALTHY', services: [
    { id: 'database', status: 'UP' }, { id: 'aiService', status: 'UP' },
  ] } });
  expect(Number.isNaN(Date.parse(response.body.data.checkedAt))).toBe(false);
  expect(receivedKey).toBe(config.internalApiKey);
  expect(JSON.stringify(response.body)).not.toContain(config.internalApiKey);
});

// AI trả 503 hoặc body sai hợp đồng phải báo DOWN và hệ thống DEGRADED.
it.each(['unavailable', 'invalid'])('reports AI DOWN for %s HTTP responses', async (failure) => {
  mode = failure;
  const response = await authenticated();
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({ status: 'DEGRADED', services: [
    { id: 'database', status: 'UP' }, { id: 'aiService', status: 'DOWN' },
  ] });
});

// Body bị treo phải có giới hạn thời gian, không để request health treo mãi.
it('bounds a stalled HTTP body instead of leaving the health request pending', async () => {
  mode = 'hanging';
  const started = performance.now();
  const response = await authenticated();
  expect(response.body.data.services[1].status).toBe('DOWN');
  expect(performance.now() - started).toBeLessThan(5000);
});

// Lỗi probe DB phải được che, không lộ chi tiết (mật khẩu, chuỗi kết nối).
it('redacts DB probe failures after successful authentication', async () => {
  vi.spyOn(healthRepository, 'checkDatabase').mockRejectedValue(new Error('private-db-password'));
  const response = await authenticated();
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({ status: 'DEGRADED', services: [
    { id: 'database', status: 'DOWN' }, { id: 'aiService', status: 'UP' },
  ] });
  expect(JSON.stringify(response.body)).not.toContain('private-db-password');
});

// Nếu DB lỗi ngay ở bước xác thực thì trả 500, không chạy probe và không bịa kết quả khỏe mạnh.
it('returns an unavailable request when DB authentication fails, without inventing healthy probes', async () => {
  vi.spyOn(userRepository, 'findAuthIdentityById').mockRejectedValue(new Error('private-auth-db-password'));
  const probe = vi.spyOn(healthRepository, 'checkDatabase');
  const response = await authenticated();
  expect(response.status).toBe(500);
  expect(response.body.success).toBe(false);
  expect(response.body.data).toBeUndefined();
  expect(JSON.stringify(response.body)).not.toContain('private-auth-db-password');
  expect(probe).not.toHaveBeenCalled();
  expect(receivedKey).toBeUndefined();
});

// API mô hình AI qua quyền admin trả UNKNOWN khi chưa có lượt gọi nào.
it('returns unknown model metrics through the authorized API when there are no observations', async () => {
  vi.spyOn(aiLogRepository, 'findRecent').mockResolvedValue([]);
  const response = await request(app).get('/api/admin/ai/models').set('Authorization', `Bearer ${adminToken}`);
  expect(response.status).toBe(200);
  expect(response.body.data.length).toBeGreaterThan(0);
  for (const model of response.body.data) {
    expect(model).toMatchObject({ status: 'UNKNOWN', successRate: null, totalCalls: 0, lastActive: null });
  }
});
