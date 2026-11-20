// d:\Projects\FPT\SWP391\server\tests/aiAuthorization.test.js
// Kiểm thử tích hợp (cần DB test): BE tự chịu trách nhiệm xác thực/phân quyền AI, không tin header do client gửi.
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app.js';
import config from '../src/config/index.js';
import prisma from '../src/config/prisma.js';
import { userRepository } from '../src/repositories/user.repository.js';
import { generateToken } from '../src/utils/jwt.js';
import { createGuestSession } from './helpers/guestSession.js';

// Tiền tố dữ liệu, user test, bản ghi riêng tư của người khác và các hàm tiện ích tạo token/request.
const PREFIX = `ai-authorization-${randomUUID()}`;
const userIds = [];
let member, other, admin, memberToken, adminToken, privateRecord, guestSession;
const token = (user, role = user.role) => generateToken({ user_id: user.user_id, role });
const postChat = () => request(app).post('/api/ai/chat/stream').set('X-Guest-Id', PREFIX);
const auth = (pending, value = memberToken) => pending.set('Authorization', `Bearer ${value}`);
const payload = { message: 'Kiểm tra ranh giới xác thực' };
const trace = { modelName: 'authorization-test-model', attempt: 1, messages: [{ role: 'user', content: payload.message }] };
// Luồng SSE giả từ AI: metadata → token → done.
const upstream = () => new Response([
  `event: metadata\ndata: ${JSON.stringify({ data: trace })}\n\n`,
  'event: token\ndata: {"token":"Phản hồi kiểm thử"}\n\n',
  `event: done\ndata: ${JSON.stringify({ success: true, meta: { modelName: trace.modelName } })}\n\n`,
].join(''), { headers: { 'Content-Type': 'text/event-stream' } });

// Tạo user test và lưu ID để dọn dẹp.
// @param name tên hiển thị
// @param role vai trò (1 = admin, 2 = thành viên)
async function createUser(name, role = 2) {
  const user = await prisma.user.create({ data: {
    email: `${PREFIX}-${name}@example.invalid`, full_name: name, role, password_hash: 'unused-test-hash',
  } });
  userIds.push(user.user_id);
  return user;
}
// Tạo thành viên, người khác, admin và một AI generation riêng tư của người khác.
beforeAll(async () => {
  member = await createUser('member');
  other = await createUser('other');
  admin = await createUser('admin', 1);
  memberToken = token(member); adminToken = token(admin);
  privateRecord = await prisma.aiGeneration.create({ data: {
    userId: other.user_id, type: 'CHAT', modelName: trace.modelName, requestPayload: payload, promptMessages: [trace],
  } });
});
// Khôi phục mock sau mỗi test; dọn user, hạn mức khách và đóng DB khi xong.
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
afterAll(async () => {
  await prisma.user.deleteMany({ where: { user_id: { in: userIds } } });
  if (guestSession) await prisma.guestQuota.deleteMany({ where: { guestId: guestSession.guestId } });
  await prisma.$disconnect();
});

// Nhóm test: BE sở hữu việc xác thực và phân quyền AI.
describe('backend owns AI authentication and authorization', () => {
  // Token hết hạn, sai chữ ký, thiếu/sai kiểu/âm/tràn user ID, claims dạng chuỗi hoặc header thừa
  // đều bị 401 trước khi trừ hạn mức, ghi DB hay gọi AI; không cấp cookie khách.
  it.each([
    ['expired', () => jwt.sign({ user_id: member.user_id }, config.jwt.secret, { expiresIn: -1 })],
    ['wrong signature', () => jwt.sign({ user_id: member.user_id }, randomUUID())],
    ['missing user ID', () => generateToken({ role: 1 })],
    ['string user ID', () => generateToken({ user_id: String(member.user_id) })],
    ['invalid user ID', () => generateToken({ user_id: -1 })],
    ['out-of-range user ID', () => generateToken({ user_id: 2_147_483_648 })],
    ['string claims', () => jwt.sign('invalid-claims', config.jwt.secret)],
    ['extra bearer credentials', () => `${memberToken} extra`],
  ])('rejects %s before quota, persistence or inference', async (_name, invalidToken) => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const before = await prisma.aiGeneration.count();
    const response = await auth(postChat(), invalidToken()).send(payload);
    expect(response.status).toBe(401);
    expect(response.body.errorCode).toBe('UNAUTHORIZED');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await prisma.aiGeneration.count()).toBe(before);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(await prisma.guestQuota.findFirst({ where: { guestId: PREFIX } })).toBeNull();
  });

  // Tài khoản bị khóa, đã xóa hoặc xóa mềm bị 403 dù token còn hợp lệ.
  it.each([
    ['locked', { status: 'LOCKED' }], ['deleted', { status: 'DELETED' }],
    ['soft deleted', { status: 'ACTIVE', deleted_at: new Date() }],
  ])('rejects a %s account with an otherwise valid token', async (_name, data) => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await prisma.user.update({ where: { user_id: member.user_id }, data });
    try {
      expect((await auth(postChat()).send(payload)).status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await prisma.user.update({ where: { user_id: member.user_id }, data: { status: 'ACTIVE', deleted_at: null } });
    }
  });

  // Token của tài khoản đã bị xóa vĩnh viễn phải bị 401.
  it('rejects a token after its account is permanently removed', async () => {
    const removed = await createUser('removed');
    const removedToken = token(removed);
    await prisma.user.delete({ where: { user_id: removed.user_id } });
    expect((await auth(request(app).get('/api/ai/usage'), removedToken)).status).toBe(401);
  });

  // Thành viên bị 403 ở các route quản trị AI dù token tự nhận admin và gửi header giả danh.
  it.each([
    ['get', '/api/v1/ai-logs'], ['get', '/api/v1/ai-logs/stats'],
    ['get', `/api/v1/guest-quotas/${PREFIX}`], ['delete', `/api/v1/guest-quotas/${PREFIX}`],
    ['post', '/api/admin/ai/chatbot-cache/clear'], ['post', '/api/admin/ai/guest-quota/reset'],
  ])('denies member access to %s %s even with admin claims and headers', async (method, path) => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const response = await auth(request(app)[method](path), token(member, 1))
      .set('X-User-Id', String(admin.user_id)).set('X-User-Role', 'ADMIN').send({ guestId: PREFIX });
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Không có JWT thì header X-User-Id/X-User-Role/X-Internal-Api-Key do client gửi bị bỏ qua (401).
  it('ignores user and role headers without a JWT on admin routes', async () => {
    const response = await request(app).post('/api/admin/ai/chatbot-cache/clear')
      .set('X-User-Id', String(admin.user_id)).set('X-User-Role', 'ADMIN')
      .set('X-Internal-Api-Key', process.env.INTERNAL_API_KEY);
    expect(response.status).toBe(401);
  });

  // Thu hồi quyền admin trong DB có hiệu lực ngay với token admin đã cấp trước đó.
  it('applies a role revocation to a previously issued admin token', async () => {
    await prisma.user.update({ where: { user_id: admin.user_id }, data: { role: 2 } });
    try {
      expect((await auth(request(app).get('/api/v1/ai-logs'), adminToken)).status).toBe(403);
    } finally {
      await prisma.user.update({ where: { user_id: admin.user_id }, data: { role: 1 } });
    }
    expect((await auth(request(app).get('/api/v1/ai-logs?limit=1'), adminToken)).status).toBe(200);
  });

  // BE chỉ chuyển tiếp danh tính thành viên đã xác minh và khóa nội bộ thật tới AI, loại bỏ header giả mạo của client.
  it('forwards only the verified member identity and internal key to AI', async () => {
    const fetchMock = vi.fn(async () => upstream()); vi.stubGlobal('fetch', fetchMock);
    const response = await auth(postChat()).set('X-User-Id', String(other.user_id))
      .set('X-User-Role', 'ADMIN').set('X-Internal-Api-Key', 'untrusted-client-key').send(payload);
    expect(response.text).toContain('event: done');
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['X-User-Id']).toBe(String(member.user_id));
    expect(headers['X-Internal-Api-Key']).toBe(process.env.INTERNAL_API_KEY);
    expect(headers['X-User-Role']).toBeUndefined();
    expect(headers.Authorization).toBeUndefined();
    expect(headers['X-Guest-Id']).toBeUndefined();
    expect(await prisma.aiGeneration.count({ where: { userId: member.user_id, status: 'COMPLETED' } })).toBe(1);
  });

  // Header giả mạo không giúp thành viên đọc lịch sử AI của người khác.
  it('does not let a member assume ownership through headers', async () => {
    const response = await auth(request(app).get(`/api/v1/ai-generations/${privateRecord.id}`), token(member, 1))
      .set('X-User-Id', String(other.user_id)).set('X-User-Role', 'ADMIN');
    expect(response.status).toBe(404);
    const own = await auth(request(app).get(`/api/v1/ai-generations/${privateRecord.id}`), token(other));
    expect(own.status).toBe(200);
  });

  // DB lỗi khi xác thực thì trả 500, không hạ cấp thành quyền khách và không lộ chi tiết lỗi.
  it('does not downgrade a database failure to guest access', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(userRepository, 'findAuthIdentityById').mockRejectedValueOnce(new Error('PRIVATE_DATABASE_DETAIL'));
    const response = await auth(postChat()).send(payload);
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('PRIVATE_DATABASE_DETAIL');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Không có JWT thì luôn ở chế độ khách dù gửi header danh tính giả; khách không có lịch sử generation.
  it('keeps a caller without JWT in guest mode despite forged identity headers', async () => {
    guestSession = await createGuestSession(app);
    const fetchMock = vi.fn(async () => upstream()); vi.stubGlobal('fetch', fetchMock);
    const count = await prisma.aiGeneration.count();
    const response = await guestSession.agent.post('/api/ai/chat/stream').set('X-Guest-Id', PREFIX)
      .set('X-User-Id', String(admin.user_id)).set('X-User-Role', 'ADMIN').send(payload);
    expect(response.text).toContain('"remaining":2');
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['X-Guest-Id']).toBe(guestSession.guestId);
    expect(headers['X-User-Id']).toBeUndefined();
    expect(headers['X-User-Role']).toBeUndefined();
    expect(await prisma.aiGeneration.count()).toBe(count);
  });
});
