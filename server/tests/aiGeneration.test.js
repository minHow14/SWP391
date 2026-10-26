// D:/SWP391/SWP391/server/tests/aiGeneration.test.js
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { aiLogService } from '../src/services/aiLogService.js';
import { createGuestSession } from './helpers/guestSession.js';

const trace = { modelName: 'generation-test-model', attempt: 1, messages: [
  { role: 'system', content: 'INTERNAL_PROMPT_FOR_PERSISTENCE_TEST' }, { role: 'user', content: 'Thực đơn chay' },
] };
const stream = (events) => new Response(events.map(([name, data]) => `event: ${name}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`).join(''), { headers: { 'Content-Type': 'text/event-stream' } });
const metadata = (data = trace) => ['metadata', { success: true, data }];
const done = (data) => ['done', { success: true, ...(data && { data }), meta: { modelName: trace.modelName } }];
let owner, other, token;
const guestIds = [];
beforeAll(async () => {
  const data = (name) => ({ email: `ai-generation-${name}-${randomUUID()}@example.invalid`, full_name: name, password_hash: 'unused-test-hash' });
  owner = await prisma.user.create({ data: data('owner') });
  other = await prisma.user.create({ data: data('other') });
  token = generateToken({ user_id: owner.user_id, role: owner.role });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
afterAll(async () => {
  await prisma.user.deleteMany({ where: { user_id: { in: [owner.user_id, other.user_id] } } });
  await prisma.guestQuota.deleteMany({ where: { guestId: { in: guestIds } } });
  await prisma.$disconnect();
});
const generate = (payload, path = 'chat/stream') => request(app).post(`/api/ai/${path}`).set('Authorization', `Bearer ${token}`).send(payload);
const latest = () => prisma.aiGeneration.findFirst({ where: { userId: owner.user_id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });

describe('persisted AI generations with real PostgreSQL', () => {
  it('saves validated input, actual prompts including retries, reply and completion before done', async () => {
    const payload = { message: 'Thực đơn chay', dietaryType: 'vegan' };
    const second = { ...trace, attempt: 2, messages: [...trace.messages, { role: 'user', content: 'Điều chỉnh' }] };
    vi.stubGlobal('fetch', vi.fn(async () => stream([metadata(), metadata(second), ['token', { token: 'Đậu ' }], ['token', { token: 'hũ' }], done()])));
    const response = await generate(payload);
    const record = await latest();
    expect(record.requestPayload).toEqual({ ...payload, history: [] });
    expect(record.promptMessages).toEqual([trace, second]);
    expect(record.responsePayload).toEqual({ reply: 'Đậu hũ' });
    expect(record.status).toBe('COMPLETED');
    expect(record.completedAt).toBeInstanceOf(Date);
    expect(response.text).toContain(`"generationId":"${record.id}"`);
    expect(response.text).not.toContain('INTERNAL_PROMPT_FOR_PERSISTENCE_TEST');
    expect(response.text).not.toContain('event: metadata');
  });
  it('stores the complete seven-day result without truncating days', async () => {
    const weeklyPlan = Array.from({ length: 7 }, (_, index) => ({ day: index + 1, meals: [{ name: `Test meal ${index + 1}` }] }));
    const result = { title: 'Test weekly plan', weeklyPlan };
    vi.stubGlobal('fetch', vi.fn(async () => stream([metadata(), done(result)])));
    const response = await generate({ heightCm: 170, weightKg: 65, days: 7 }, 'meal-planner/generate/stream');
    expect(response.text).toContain('event: done');
    const record = await latest();
    expect(record.type).toBe('MEAL_PLAN');
    expect(record.responsePayload).toEqual(result);
  });
  it('keeps saved prompts and FAILED status on an upstream error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => stream([metadata(), ['error', { errorCode: 'AI_PROVIDER_ERROR', message: 'PRIVATE_DETAIL' }]])));
    const response = await generate({ message: 'Test failure' });
    const record = await latest();
    expect(record.status).toBe('FAILED');
    expect(record.promptMessages).toEqual([trace]);
    expect(record.responsePayload).toBeNull();
    expect(record.errorCode).toBe('AI_PROVIDER_ERROR');
    expect(record.errorMessage).not.toContain('PRIVATE_DETAIL');
    expect(response.text).not.toContain('event: done');
  });
  it('rolls back completion when audit persistence fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => stream([metadata(), done()])));
    vi.spyOn(aiLogService, 'recordLog').mockRejectedValueOnce(new Error('audit unavailable'));
    const response = await generate({ message: 'Test rollback' });
    const record = await latest();
    expect(record.status).toBe('FAILED');
    expect(record.responsePayload).toBeNull();
    expect(response.text).not.toContain('event: done');
  });
  it('requires prompt capture before reporting a member generation as completed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => stream([done()])));
    const response = await generate({ message: 'Test missing prompt' });
    expect(response.text).toContain('AI_PROMPT_MISSING');
    expect((await latest()).status).toBe('FAILED');
  });
  it('restricts history to its owner and keeps system prompts internal', async () => {
    const record = await latest();
    const own = await request(app).get(`/api/v1/ai-generations/${record.id}`).set('Authorization', `Bearer ${token}`);
    expect(own.status).toBe(200);
    expect(own.body.data.id).toBe(record.id);
    expect(own.body.data.promptMessages).toBeUndefined();
    const foreignToken = generateToken({ user_id: other.user_id, role: other.role });
    expect((await request(app).get(`/api/v1/ai-generations/${record.id}`).set('Authorization', `Bearer ${foreignToken}`)).status).toBe(404);
    expect((await request(app).get('/api/v1/ai-generations')).status).toBe(401);
    const page = await request(app).get('/api/v1/ai-generations?limit=1&page=1').set('Authorization', `Bearer ${token}`);
    expect(page.body.data).toHaveLength(1);
    expect(page.body.meta.total).toBeGreaterThan(1);
    expect((await request(app).get('/api/v1/ai-generations?userId=1').set('Authorization', `Bearer ${token}`)).status).toBe(400);
  });
  it('does not create histories for guests', async () => {
    const session = await createGuestSession(app);
    guestIds.push(session.guestId);
    const count = await prisma.aiGeneration.count();
    vi.stubGlobal('fetch', vi.fn(async () => stream([metadata(), done()])));
    const response = await session.agent.post('/api/ai/chat/stream').send({ message: 'Guest test' });
    expect(response.text).toContain('event: done');
    expect(await prisma.aiGeneration.count()).toBe(count);
  });

  it('does not apply guest daily quota to authenticated chat and meal requests', async () => {
    const guestId = `member-quota-${randomUUID()}`;
    vi.stubGlobal('fetch', vi.fn(async (url) => stream([
      metadata(), ['token', { token: 'Kiểm tra hạn mức thành viên' }],
      done(url.includes('meal-planner') ? { weeklyPlan: [{ dayNumber: 1 }] } : undefined),
    ])));
    for (let index = 0; index < 4; index++) {
      const path = index % 2 ? 'meal-planner/generate/stream' : 'chat/stream';
      const payload = index % 2 ? { heightCm: 170, weightKg: 65, days: 1 } : { message: 'Kiểm tra hạn mức thành viên' };
      const response = await generate(payload, path).set('X-Guest-Id', guestId);
      expect(response.status).toBe(200);
      expect(response.text).toContain('event: done');
      expect(response.text).toContain('"remaining":null');
    }
    expect(await prisma.guestQuota.findFirst({ where: { guestId } })).toBeNull();
    const usage = await request(app).get('/api/ai/usage').set('Authorization', `Bearer ${token}`);
    expect(usage.body.data).toMatchObject({ unlimited: true, remaining: null, dailyLimit: null });
  });
});
