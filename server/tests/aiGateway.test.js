// D:/SWP391/SWP391/server/tests/aiGateway.test.js
import { EventEmitter } from 'node:events';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { aiConfig } from '../src/config/aiConfig.js';
import prisma from '../src/config/prisma.js';
import { aiService } from '../src/services/ai.service.js';
import { aiLogService } from '../src/services/aiLogService.js';
import { createGuestSession } from './helpers/guestSession.js';

vi.mock('../src/config/aiConfig.js', async (importOriginal) => {
  const original = await importOriginal();
  return { aiConfig: { ...original.aiConfig } };
});

const ORIGINAL_TIMEOUT_MS = aiConfig.timeoutMs;
const TEST_UPSTREAM_TIMEOUT_MS = 1000;
const KEY_HEADERS = { 'Content-Type': 'text/event-stream' };
const upstreamDone = { success: true, status: 'completed', meta: { modelName: 'gateway-test-model' } };
let guestId, guestSession;
const guestIds = [];
const sse = (events) => new Response(events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join(''), { headers: KEY_HEADERS });
const chat = (payload = { message: 'Kiểm thử gateway' }) => guestSession.agent.post('/api/ai/chat/stream').send(payload);
const usage = () => prisma.guestQuota.findFirst({ where: { guestId } });

beforeEach(async () => {
  guestSession = await createGuestSession(app);
  guestId = guestSession.guestId;
  guestIds.push(guestId);
});
afterEach(() => { aiConfig.timeoutMs = ORIGINAL_TIMEOUT_MS; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
afterAll(async () => {
  await prisma.guestQuota.deleteMany({ where: { guestId: { in: guestIds } } });
  await prisma.$disconnect();
});

describe('AI gateway regression tests against the isolated database', () => {
  it('sends internal authentication, streams tokens, persists success and reports remaining quota', async () => {
    const upstream = vi.fn(async () => sse([['token', { token: 'Đậu phụ' }], ['done', upstreamDone]]));
    vi.stubGlobal('fetch', upstream);
    const response = await chat();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Đậu phụ');
    expect(response.text).toContain('"remaining":2');
    expect((await usage()).usedCount).toBe(1);
    const options = upstream.mock.calls[0][1];
    expect(options.headers['X-Internal-Api-Key']).toBe(process.env.INTERNAL_API_KEY);
    expect(options.headers.Authorization).toBeUndefined();
    const log = await prisma.aiLog.findFirst({ where: { modelName: 'gateway-test-model' }, orderBy: { logId: 'desc' } });
    expect(log.status).toBe('SUCCESS');
  });

  it('returns a real 429 after three shared guest turns', async () => {
    const upstream = vi.fn(async () => sse([['done', upstreamDone]]));
    vi.stubGlobal('fetch', upstream);
    for (let index = 0; index < 3; index++) expect((await chat()).status).toBe(200);
    const exhausted = await chat();
    expect(exhausted.status).toBe(429);
    expect(exhausted.body.errorCode).toBe('AI_QUOTA_EXCEEDED');
    expect(exhausted.body.meta.resetAt).toMatch(/Z$/);
    expect(upstream).toHaveBeenCalledTimes(3);
  });

  it('shares three daily turns across chat and meal plans and ignores upstream quota claims', async () => {
    const upstream = vi.fn(async (url) => sse([
      ['token', { token: 'Kiểm thử quota' }],
      ['done', { ...upstreamDone, remaining: 999, ...(url.includes('meal-planner') && { data: { weeklyPlan: [{ dayNumber: 1 }] } }) }],
    ]));
    vi.stubGlobal('fetch', upstream);
    const mealPlan = () => guestSession.agent.post('/api/ai/meal-planner/generate/stream')
      .send({ heightCm: 170, weightKg: 65, days: 1 });
    expect((await chat()).text).toContain('"remaining":2');
    expect((await mealPlan()).text).toContain('"remaining":1');
    expect((await chat()).text).toContain('"remaining":0');
    const denied = await mealPlan();
    expect(denied.status).toBe(429);
    expect(denied.body.errorCode).toBe('AI_QUOTA_EXCEEDED');
    expect(upstream).toHaveBeenCalledTimes(3);
    const status = await guestSession.agent.get('/api/ai/usage');
    expect(status.body.data).toMatchObject({ used: 3, remaining: 0, dailyLimit: 3 });
  });

  it('allows only three upstream calls when mixed chat and meal requests arrive concurrently', async () => {
    const upstream = vi.fn(async (url) => sse([['done', {
      ...upstreamDone, ...(url.includes('meal-planner') && { data: { weeklyPlan: [{ dayNumber: 1 }] } }),
    }]]));
    vi.stubGlobal('fetch', upstream);
    const responses = await Promise.all(Array.from({ length: 8 }, (_, index) => index % 2 ? chat() : guestSession.agent
      .post('/api/ai/meal-planner/generate/stream').send({ heightCm: 170, weightKg: 65, days: 1 })));
    expect(responses.filter((response) => response.status === 200)).toHaveLength(3);
    expect(responses.filter((response) => response.status === 429)).toHaveLength(5);
    expect(upstream).toHaveBeenCalledTimes(3);
    expect((await usage()).usedCount).toBe(3);
  });

  it('reads quota from BE without calling AI or consuming a turn', async () => {
    const upstream = vi.fn(); vi.stubGlobal('fetch', upstream);
    for (let index = 0; index < 2; index++) {
      const response = await guestSession.agent.get('/api/ai/usage');
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ used: 0, remaining: 3 });
    }
    expect(upstream).not.toHaveBeenCalled();
    expect(await usage()).toBeNull();
  });

  it.each(['chatbot', 'mealPlanner'])('refunds an SSE error for %s without recording SUCCESS', async (feature) => {
    vi.stubGlobal('fetch', vi.fn(async () => sse([['error', { success: false, errorCode: 'AI_PROVIDER_ERROR', message: 'PRIVATE_PROVIDER_DETAIL' }]])));
    const before = await prisma.aiLog.count({ where: { status: 'SUCCESS' } });
    const response = feature === 'chatbot' ? await chat() : await guestSession.agent
      .post('/api/ai/meal-planner/generate/stream').send({ heightCm: 170, weightKg: 65 });
    expect(response.status).toBe(200);
    expect(response.text).toContain('event: error');
    expect(response.text).not.toContain('PRIVATE_PROVIDER_DETAIL');
    expect(response.text).not.toContain('event: done');
    expect((await usage()).usedCount).toBe(0);
    expect(await prisma.aiLog.count({ where: { status: 'SUCCESS' } })).toBe(before);
  });

  it('refunds network failures before SSE headers and keeps provider details private', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('PRIVATE_PROVIDER_DETAIL'); }));
    const response = await chat();
    expect(response.status).toBe(502);
    expect(response.body.errorCode).toBe('AI_PROVIDER_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('PRIVATE_PROVIDER_DETAIL');
    expect((await usage()).usedCount).toBe(0);
  });

  it('treats EOF without a done event as an interrupted request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sse([['token', { token: 'Chưa hoàn tất' }]])));
    const response = await chat();
    expect(response.text).toContain('AI_STREAM_INTERRUPTED');
    expect(response.text).not.toContain('event: done');
    expect((await usage()).usedCount).toBe(0);
  });

  it('does not report completion when success logging fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sse([['done', upstreamDone]])));
    vi.spyOn(aiLogService, 'recordLog').mockRejectedValueOnce(new Error('audit unavailable'));
    const response = await chat();
    expect(response.text).toContain('event: error');
    expect(response.text).not.toContain('event: done');
    expect((await usage()).usedCount).toBe(0);
  });

  it('validates input before consuming quota or calling AI', async () => {
    const upstream = vi.fn(); vi.stubGlobal('fetch', upstream);
    const response = await chat({ message: '   ' });
    expect(response.status).toBe(422);
    expect(response.body.errors[0].field).toBe('message');
    expect(upstream).not.toHaveBeenCalled();
    expect(await usage()).toBeNull();
  });

  it('rejects an invalid JWT instead of silently switching to guest mode', async () => {
    const response = await request(app).get('/api/ai/usage').set('Authorization', 'Bearer invalid');
    expect(response.status).toBe(401);
  });

  it('times out an upstream request and refunds its reservation', async () => {
    // Exercise cancellation within the test deadline regardless of the deployment timeout.
    aiConfig.timeoutMs = TEST_UPSTREAM_TIMEOUT_MS;
    const upstream = vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }));
    vi.stubGlobal('fetch', upstream);
    const response = await chat();
    expect(response.status).toBe(504);
    expect(response.body.errorCode).toBe('AI_TIMEOUT');
    expect(upstream).toHaveBeenCalledOnce();
    expect(upstream.mock.calls[0][1].signal.aborted).toBe(true);
    expect((await usage()).usedCount).toBe(0);
  });

  it('aborts an active AI stream and refunds when the client disconnects', async () => {
    let signal;
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
      signal = options.signal;
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(new TextEncoder().encode('event: token\ndata: {"token":"đang trả lời"}\n\n'));
        signal.addEventListener('abort', () => controller.error(signal.reason), { once: true });
      } }), { headers: KEY_HEADERS });
    }));
    const res = Object.assign(new EventEmitter(), {
      headersSent: false, destroyed: false, writableFinished: false,
      set() {}, flushHeaders() { this.headersSent = true; },
      write() { this.destroyed = true; this.emit('close'); }, end() { this.writableFinished = true; },
    });
    await aiService.streamChat({ payload: { message: 'Kiểm thử hủy' }, identity: { guestId }, res, requestId: 'cancel-test' });
    expect(signal.aborted).toBe(true);
    expect((await usage()).usedCount).toBe(0);
  });
});
