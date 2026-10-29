// server/tests/videoRecipeSummaryApi.test.js
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { videoRecipeSummaryJobRepository as jobs } from '../src/repositories/videoRecipeSummaryJobRepository.js';

const BASE = '/api/v1/video-recipe-summary-jobs';
const VIDEO_URL = 'https://www.youtube.com/watch?v=AbCdEfGhI12';
let owner, other, token, otherToken;
const create = (videoUrl = VIDEO_URL) => request(app).post(BASE).set('Authorization', `Bearer ${token}`).send({ videoUrl });
beforeAll(async () => {
  const user = (name) => ({ email: `video-api-${name}-${randomUUID()}@example.invalid`, full_name: name, password_hash: 'unused-test-hash' });
  owner = await prisma.user.create({ data: user('owner') });
  other = await prisma.user.create({ data: user('other') });
  token = generateToken({ user_id: owner.user_id });
  otherToken = generateToken({ user_id: other.user_id });
});
beforeEach(async () => { await prisma.videoRecipeSummaryJob.deleteMany({ where: { userId: owner.user_id } }); });
afterAll(async () => {
  await prisma.user.deleteMany({ where: { user_id: { in: [owner?.user_id, other?.user_id].filter(Boolean) } } });
  await prisma.$disconnect();
});

describe('authenticated video recipe job API', () => {
  it('rejects missing or invalid credentials before input validation and job creation', async () => {
    expect((await request(app).post(BASE).send({ videoUrl: 'invalid' })).status).toBe(401);
    expect((await request(app).post(BASE).set('Authorization', 'Bearer invalid').send({ videoUrl: VIDEO_URL })).status).toBe(401);
    expect(await prisma.videoRecipeSummaryJob.count({ where: { userId: owner.user_id } })).toBe(0);
  });
  it('creates a pending job with safe fields and canonical URL', async () => {
    const response = await create('https://youtu.be/AbCdEfGhI12');
    expect(response.status).toBe(202);
    expect(response.body).toMatchObject({ success: true, data: { status: 'PENDING', stage: 'VALIDATING_VIDEO', videoUrl: VIDEO_URL } });
    expect(response.body.data.jobId).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.body.data).not.toHaveProperty('transcript');
    expect(response.body.data).not.toHaveProperty('leaseToken');
    expect(response.body.data).not.toHaveProperty('userId');
  });
  it('deduplicates concurrent submissions and blocks a different active video', async () => {
    const responses = await Promise.all(Array.from({ length: 4 }, () => create()));
    expect(responses.every((response) => response.status === 202)).toBe(true);
    expect(new Set(responses.map((response) => response.body.data.jobId)).size).toBe(1);
    const busy = await create('https://youtu.be/AnotherId12');
    expect(busy.status).toBe(409);
    expect(busy.body.errorCode).toBe('VIDEO_JOB_ALREADY_ACTIVE');
  });
  it('rejects unsafe URLs, forged ownership and invalid pagination', async () => {
    expect((await create('https://youtube.com.attacker.invalid/watch?v=AbCdEfGhI12')).status).toBe(400);
    const forged = await request(app).post(BASE).set('Authorization', `Bearer ${token}`).send({ videoUrl: VIDEO_URL, userId: other.user_id });
    expect(forged.status).toBe(400);
    expect((await request(app).get(`${BASE}?limit=101`).set('Authorization', `Bearer ${token}`)).status).toBe(400);
    expect((await request(app).get(`${BASE}?userId=${other.user_id}`).set('Authorization', `Bearer ${token}`)).status).toBe(400);
  });
  it('allows only owners to read/retry jobs and read summaries', async () => {
    const { body } = await create();
    const id = body.data.jobId;
    expect((await request(app).get(`${BASE}/${id}`).set('Authorization', `Bearer ${token}`)).status).toBe(200);
    expect((await request(app).get(`${BASE}/${id}`).set('Authorization', `Bearer ${otherToken}`)).status).toBe(404);
    expect((await request(app).post(`${BASE}/${id}/retries`).set('Authorization', `Bearer ${otherToken}`).send({})).status).toBe(404);
    const job = await jobs.claim({ leaseMs: 90_000, maxAttempts: 3 });
    const summary = await jobs.complete({ job, recipe: { title: null, ingredients: [], steps: [{ instruction: 'Xào nấm.', sourceSegmentIndexes: [0] }] } });
    const path = `/api/v1/video-recipe-summaries/${summary.id}`;
    expect((await request(app).get(path).set('Authorization', `Bearer ${otherToken}`)).status).toBe(404);
    expect((await request(app).get(path).set('Authorization', `Bearer ${token}`)).body.data.recipe.steps).toHaveLength(1);
    expect((await create()).status).toBe(200);
  });
  it('lists owned jobs for reload and retries a failed job without discarding transcript', async () => {
    const { body } = await create();
    const transcript = { language: 'vi', durationSeconds: 1, segments: [{ startSeconds: 0, endSeconds: 1, text: 'Xào nấm.' }] };
    await prisma.videoRecipeSummaryJob.update({ where: { id: body.data.jobId },
      data: { status: 'FAILED', activeUserId: null, transcript, errorCode: 'AI_PROVIDER_ERROR' } });
    expect((await create()).status).toBe(409);
    const retry = await request(app).post(`${BASE}/${body.data.jobId}/retries`).set('Authorization', `Bearer ${token}`).send({});
    expect(retry.status).toBe(202);
    expect((await jobs.findSource({ userId: owner.user_id, videoId: 'AbCdEfGhI12', pipelineVersion: '1' })).transcript).toEqual(transcript);
    const page = await request(app).get(`${BASE}?status=PENDING&limit=1&page=1`).set('Authorization', `Bearer ${token}`);
    expect(page.body.data).toHaveLength(1);
    expect(page.body.meta).toMatchObject({ total: 1, limit: 1, page: 1 });
    expect((await request(app).get(BASE).set('Authorization', `Bearer ${otherToken}`)).body.data).toEqual([]);
  });
});
