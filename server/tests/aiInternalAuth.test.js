// D:/SWP391/SWP391/server/tests/aiInternalAuth.test.js
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { aiConfig } from '../src/config/aiConfig.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { createGuestSession } from './helpers/guestSession.js';

vi.mock('../src/config/aiConfig.js', async (importOriginal) => {
  const original = await importOriginal();
  return { aiConfig: { ...original.aiConfig } };
});

const PREFIX = `ai-internal-auth-${randomUUID()}`;
const ORIGINAL_KEY = aiConfig.internalApiKey;
let member, admin, memberToken, adminToken, guestSession;
const failure = (status) => new Response(`PRIVATE_RESPONSE_${ORIGINAL_KEY}`, { status });
const requestGeneration = (path = 'chat/stream') => guestSession.agent.post(`/api/ai/${path}`);
const chatPayload = { message: 'Kiểm tra khóa nội bộ' };
const action = () => `ADMIN_CLEAR_CHATBOT_CACHE_BY_${admin.user_id}`;

beforeAll(async () => {
  guestSession = await createGuestSession(app);
  const data = (name, role) => ({ email: `${PREFIX}-${name}@example.invalid`, full_name: name, password_hash: 'unused-test-hash', role });
  member = await prisma.user.create({ data: data('member', 2) });
  admin = await prisma.user.create({ data: data('admin', 1) });
  memberToken = generateToken({ user_id: member.user_id }); adminToken = generateToken({ user_id: admin.user_id });
});
afterEach(() => { aiConfig.internalApiKey = ORIGINAL_KEY; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
afterAll(async () => {
  await prisma.user.deleteMany({ where: { user_id: { in: [member.user_id, admin.user_id] } } });
  await prisma.guestQuota.deleteMany({ where: { guestId: guestSession.guestId } });
  await prisma.$disconnect();
});

describe('internal AI authentication failures', () => {
  it.each(['guest', 'member'])('rejects missing BE configuration before reserving or starting a %s generation', async (actor) => {
    aiConfig.internalApiKey = undefined;
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const before = await prisma.aiGeneration.count();
    const pending = requestGeneration();
    if (actor === 'member') pending.set('Authorization', `Bearer ${memberToken}`);
    const response = await pending.send(chatPayload);
    expect(response.status).toBe(503);
    expect(response.body.errorCode).toBe('AI_NOT_CONFIGURED');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await prisma.aiGeneration.count()).toBe(before);
    expect(await prisma.guestQuota.findFirst({ where: { guestId: guestSession.guestId } })).toBeNull();
  });

  it.each([
    [401, 'chat/stream'], [403, 'chat/stream'],
    [401, 'meal-planner/generate/stream'], [403, 'meal-planner/generate/stream'],
  ])('classifies HTTP %i for %s, refunds quota and records only safe failure details', async (status, path) => {
    const fetchMock = vi.fn(async () => failure(status)); vi.stubGlobal('fetch', fetchMock);
    const successBefore = await prisma.aiLog.count({ where: { status: 'SUCCESS' } });
    const response = await requestGeneration(path).send(path.startsWith('chat') ? chatPayload : { heightCm: 170, weightKg: 65 });
    expect(response.status).toBe(503);
    expect(response.body.errorCode).toBe('AI_INTERNAL_AUTH_FAILED');
    expect(JSON.stringify(response.body)).not.toContain(ORIGINAL_KEY);
    expect(JSON.stringify(response.body)).not.toContain('PRIVATE_RESPONSE');
    expect(response.body.meta.requestId).toBeTruthy();
    expect((await prisma.guestQuota.findFirst({ where: { guestId: guestSession.guestId } })).usedCount).toBe(0);
    expect(await prisma.aiLog.count({ where: { status: 'SUCCESS' } })).toBe(successBefore);
    const log = await prisma.aiLog.findFirst({ orderBy: { logId: 'desc' } });
    expect(log.status).toBe('ERROR');
    expect(log.errorFeedback).toBe('AI_INTERNAL_AUTH_FAILED');
  });

  it('persists the dedicated failure code for a member without returning upstream secrets', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => failure(401)));
    const response = await requestGeneration().set('Authorization', `Bearer ${memberToken}`).send(chatPayload);
    expect(response.status).toBe(503);
    const record = await prisma.aiGeneration.findFirst({ where: { userId: member.user_id } });
    expect(record.status).toBe('FAILED');
    expect(record.errorCode).toBe('AI_INTERNAL_AUTH_FAILED');
    expect(record.errorMessage).not.toContain(ORIGINAL_KEY);
    expect(record.responsePayload).toBeNull();
  });

  it.each([401, 403])('preserves the HTTP %i auth failure on cache clear instead of reporting success', async (status) => {
    vi.stubGlobal('fetch', vi.fn(async () => failure(status)));
    const response = await request(app).post('/api/admin/ai/chatbot-cache/clear').set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(503);
    expect(response.body.errorCode).toBe('AI_INTERNAL_AUTH_FAILED');
    expect(await prisma.aiLog.count({ where: { action: action(), status: 'SUCCESS' } })).toBe(0);
  });

  it('retains genuine provider errors as a separate error category', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => failure(502)));
    const response = await requestGeneration().send(chatPayload);
    expect(response.status).toBe(502);
    expect(response.body.errorCode).toBe('AI_PROVIDER_ERROR');
  });

  it('clears cache and audits success when internal authentication succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
      expect(options.headers['X-Internal-Api-Key']).toBe(ORIGINAL_KEY);
      return new Response(JSON.stringify({ success: true, data: { cleared: 0 } }));
    }));
    const response = await request(app).post('/api/admin/ai/chatbot-cache/clear').set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.cleared).toBe(0);
    expect(await prisma.aiLog.count({ where: { action: action(), status: 'SUCCESS' } })).toBe(1);
  });
});
