// D:/SWP391/SWP391/server/tests/ingredientLookup.test.js
import './loadTestEnvironment.js';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { ingredientLookupRepository as jobs } from '../src/repositories/ingredientLookupRepository.js';
import { ingredientLookupService as lookup } from '../src/services/ingredientLookupService.js';
import { processIngredientLookupJob } from '../src/services/ingredientLookupProcessor.js';
import { runIngredientLookupWorker } from '../src/workers/ingredientLookupWorker.js';

let owner, token;
const names = [];
const actor = request.agent(app);
const submit = (payload) => actor.post('/api/v1/ingredient-lookup-jobs').send(payload);
const information = { category: 'vegetable', origin: 'Thực vật', plant: true,
  description: 'Mô tả từ nhà cung cấp AI trong kiểm thử.', cooking: 'Gợi ý nấu từ nhà cung cấp AI trong kiểm thử.', aliases: '' };
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY9sAAAAASUVORK5CYII=';

async function cleanupLookups() {
  const records = await prisma.ingredientLookupJob.findMany({ where: { ingredientName: { in: names, mode: 'insensitive' } }, select: { reservation: true } });
  const guestIds = records.map((job) => job.reservation?.guestId).filter(Boolean);
  await prisma.ingredientLookupJob.deleteMany({ where: { ingredientName: { in: names, mode: 'insensitive' } } });
  await prisma.ingredient.deleteMany({ where: { name: { in: names, mode: 'insensitive' } } });
  await prisma.guestQuota.deleteMany({ where: { guestId: { in: guestIds } } });
}

async function queue(photo) {
  const ingredientName = `Nguyên liệu kiểm thử ${randomUUID()}`;
  names.push(ingredientName);
  const response = await submit({ ingredientName, ...(photo && { photo }) });
  expect(response.status).toBe(202);
  return { ingredientName, ...response.body.data };
}

function provider(data = { isIngredient: true, ingredient: information }) {
  const fetch = vi.fn(async () => new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' },
  }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

beforeAll(async () => {
  owner = await prisma.user.create({ data: { email: `lookup-${randomUUID()}@example.invalid`,
    full_name: 'Ingredient lookup test', password_hash: 'unused-test-hash' } });
  token = generateToken({ user_id: owner.user_id });
  await actor.get('/api/v1/ai/usage');
});
beforeEach(cleanupLookups);
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
afterAll(async () => {
  await cleanupLookups();
  await prisma.user.deleteMany({ where: { user_id: owner?.user_id ?? -1 } });
  await prisma.$disconnect();
});

describe('ingredient lookup jobs', () => {
  it('returns a persisted pending job rather than filtering an empty local dictionary', async () => {
    const ingredientName = `Nguyên liệu kiểm thử ${randomUUID()}`;
    names.push(ingredientName);
    const response = await submit({ ingredientName });
    expect(response.status).toBe(202);
    expect(response.body.data).toMatchObject({ jobId: expect.any(String), status: 'PENDING', ingredient: null });
    const poll = await actor.get(`/api/v1/ingredient-lookup-jobs/${response.body.data.jobId}`);
    expect(poll.status).toBe(200);
    expect(poll.body.data).toMatchObject(response.body.data);
  });

  it('rejects empty names at the request boundary', async () => {
    expect((await submit({ ingredientName: '  ' })).status).toBe(400);
  });

  it('enforces the database name limit after Unicode normalization expands input', async () => {
    expect((await submit({ ingredientName: '\ufdfa'.repeat(12) })).status).toBe(400);
  });

  it('limits polling to the signed-in user or signed guest session that created the job', async () => {
    const job = await queue();
    const url = `/api/v1/ingredient-lookup-jobs/${job.jobId}`;
    expect((await request(app).get(url).set('Authorization', `Bearer ${token}`)).status).toBe(404);
    expect((await request(app).get(url)).status).toBe(404);
    const visible = await actor.get(url);
    expect(visible.status).toBe(200);
    for (const field of ['ownerKey', 'reservation', 'sourcePhoto', 'leaseToken']) expect(visible.body.data).not.toHaveProperty(field);
  });

  it('deduplicates simultaneous submissions by normalized name without reserving extra guest quota', async () => {
    const ingredientName = `Nguyên liệu kiểm thử ${randomUUID()}`;
    names.push(ingredientName);
    const [first, second] = await Promise.all([
      submit({ ingredientName }), submit({ ingredientName: `  ${ingredientName.toLocaleUpperCase('vi')}  ` }),
    ]);
    expect(first.status).toBe(202);
    expect(second.body.data.jobId).toBe(first.body.data.jobId);
    const row = await prisma.ingredientLookupJob.findUnique({ where: { id: first.body.data.jobId } });
    const quota = await prisma.guestQuota.findFirst({ where: { guestId: row.reservation.guestId } });
    expect(quota.usedCount).toBe(1);
  });

  it('persists real photo bytes and generated details into the existing public dictionary', async () => {
    const job = await queue({ imageBase64: png, mimeType: 'image/png' });
    const fetch = provider();
    const claimed = await jobs.claim(60_000);
    expect(claimed.id).toBe(job.jobId);
    expect((await processIngredientLookupJob(claimed)).status).toBe('COMPLETED');
    const [url, options] = fetch.mock.calls[0];
    expect(url.endsWith('/api/ingredient-lookups')).toBe(true);
    expect(Boolean(options.headers['X-Internal-Api-Key'])).toBe(true);
    expect(JSON.parse(options.body)).toEqual({ ingredientName: job.ingredientName });
    const poll = await actor.get(`/api/v1/ingredient-lookup-jobs/${job.jobId}`);
    expect(poll.body.data.ingredient).toMatchObject({ name: job.ingredientName, ...information });
    const catalog = await request(app).get('/api/workspace/catalog');
    expect(catalog.body.data.ingredients.find((item) => item.name === job.ingredientName)).toMatchObject(information);
    const image = await request(app).get(poll.body.data.ingredient.image);
    expect(image.body).toEqual(Buffer.from(png, 'base64'));
    const record = await prisma.ingredient.findUnique({ where: { name: job.ingredientName } });
    expect(record).toMatchObject({ protein: null, fat: null, carbs: null, calories_per_100g: null });
    expect(await prisma.ingredientLookupJob.findUnique({ where: { id: job.jobId } })).toMatchObject({ sourcePhoto: null, leaseToken: null });
  });

  it('returns the saved ingredient without a second job or AI quota charge', async () => {
    const job = await queue();
    provider();
    await processIngredientLookupJob(await jobs.claim(60_000));
    const response = await submit({ ingredientName: job.ingredientName });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ status: 'COMPLETED', jobId: null, ingredient: { name: job.ingredientName } });
    expect(await prisma.ingredientLookupJob.count({ where: { ingredientName: job.ingredientName } })).toBe(1);
  });

  it.each([
    ['malformed output', { isIngredient: true, ingredient: { ...information, plant: 'yes' } }, 'INGREDIENT_LOOKUP_INVALID_OUTPUT'],
    ['a noningredient', { isIngredient: false, ingredient: null }, 'INGREDIENT_NOT_RECOGNIZED'],
  ])('rejects %s without creating catalog rows and refunds the guest once', async (_label, data, errorCode) => {
    const job = await queue();
    provider(data);
    const claimed = await jobs.claim(60_000);
    expect(await processIngredientLookupJob(claimed)).toMatchObject({ status: 'FAILED', errorCode });
    expect(await prisma.ingredient.count({ where: { name: job.ingredientName } })).toBe(0);
    const quota = await prisma.guestQuota.findFirst({ where: { guestId: claimed.reservation.guestId } });
    expect(quota.usedCount).toBe(0);
    await expect(lookup.fail({ job: claimed, errorCode })).rejects.toHaveProperty('errorCode', 'INGREDIENT_LOOKUP_LEASE_LOST');
    expect((await prisma.guestQuota.findFirst({ where: { guestId: claimed.reservation.guestId } })).usedCount).toBe(0);
  });

  it('fails expired work, refunds its reservation and fences stale writes', async () => {
    const job = await queue();
    const claimed = await jobs.claim(60_000);
    await prisma.ingredientLookupJob.update({ where: { id: claimed.id }, data: { leaseExpiresAt: new Date(0) } });
    await lookup.recoverExpired();
    await lookup.recoverExpired();
    await expect(lookup.complete({ job: claimed, result: information })).rejects.toHaveProperty('errorCode', 'INGREDIENT_LOOKUP_LEASE_LOST');
    const poll = await actor.get(`/api/v1/ingredient-lookup-jobs/${job.jobId}`);
    expect(poll.body.data).toMatchObject({ status: 'FAILED', errorCode: 'INGREDIENT_LOOKUP_INTERRUPTED' });
    expect(await prisma.ingredient.count({ where: { name: job.ingredientName } })).toBe(0);
    expect((await prisma.guestQuota.findFirst({ where: { guestId: claimed.reservation.guestId } })).usedCount).toBe(0);
  });

  it('creates one dictionary entry for concurrent jobs from different owners and preserves the first saved details', async () => {
    const job = await queue();
    const second = await request(app).post('/api/v1/ingredient-lookup-jobs')
      .set('Authorization', `Bearer ${token}`).send({ ingredientName: job.ingredientName });
    expect(second.status).toBe(202);
    const claims = await Promise.all([jobs.claim(60_000), jobs.claim(60_000)]);
    expect(new Set(claims.map((item) => item.id)).size).toBe(2);
    const results = await Promise.all(claims.map((claimed) => lookup.complete({ job: claimed, result: information })));
    expect(results[0].ingredient.id).toBe(results[1].ingredient.id);
    expect(await prisma.ingredient.count({ where: { name: job.ingredientName } })).toBe(1);
    expect(await prisma.ingredientDetails.count({ where: { ingredient_id: Number(results[0].ingredient.id) } })).toBe(1);
  });

  it('rejects images whose claimed type does not match their bytes', async () => {
    const response = await submit({ ingredientName: 'Tên nguyên liệu', photo: { imageBase64: png, mimeType: 'image/jpeg' } });
    expect(response.status).toBe(400);
  });

  it('rolls back dictionary writes when linking the completed job fails', async () => {
    const job = await queue();
    provider();
    const claimed = await jobs.claim(60_000);
    vi.spyOn(jobs, 'attachIngredient').mockRejectedValueOnce(new Error('Storage failure'));
    expect((await processIngredientLookupJob(claimed)).status).toBe('FAILED');
    expect(await prisma.ingredient.count({ where: { name: job.ingredientName } })).toBe(0);
    expect((await prisma.guestQuota.findFirst({ where: { guestId: claimed.reservation.guestId } })).usedCount).toBe(0);
  });

  it('runs pending work through the local worker and stops on shutdown', async () => {
    const job = await queue();
    provider();
    const controller = new AbortController();
    const processJob = async (claimed, options) => {
      const result = await processIngredientLookupJob(claimed, options);
      controller.abort();
      return result;
    };
    await runIngredientLookupWorker({ signal: controller.signal, processJob });
    expect((await actor.get(`/api/v1/ingredient-lookup-jobs/${job.jobId}`)).body.data.status).toBe('COMPLETED');
  });
});
