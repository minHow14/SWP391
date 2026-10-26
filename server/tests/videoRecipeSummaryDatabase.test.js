// D:/SWP391/SWP391/server/tests/videoRecipeSummaryDatabase.test.js
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import prisma from '../src/config/prisma.js';
import { videoRecipeSummaryJobRepository as jobs } from '../src/repositories/videoRecipeSummaryJobRepository.js';
import { videoRecipeSummaryRepository as summaries } from '../src/repositories/videoRecipeSummaryRepository.js';

let owner, other;
const source = (patch = {}) => ({ userId: owner.user_id, activeUserId: owner.user_id,
  videoId: 'AbCdEfGhI12', videoUrl: 'https://www.youtube.com/watch?v=AbCdEfGhI12', pipelineVersion: '1', ...patch });
beforeAll(async () => {
  const user = (name) => ({ email: `video-recipe-${name}-${randomUUID()}@example.invalid`, full_name: name, password_hash: 'unused-integration-hash' });
  owner = await prisma.user.create({ data: user('owner') });
  other = await prisma.user.create({ data: user('other') });
});
beforeEach(async () => { await prisma.videoRecipeSummaryJob.deleteMany({ where: { userId: owner.user_id } }); });
afterAll(async () => {
  await prisma.user.deleteMany({ where: { user_id: { in: [owner?.user_id, other?.user_id].filter(Boolean) } } });
  await prisma.$disconnect();
});

describe('video recipe persistence with isolated PostgreSQL', () => {
  it('enforces one active job per account and one record per source version', async () => {
    await jobs.create(source());
    await expect(jobs.create(source({ videoId: 'AnotherId12' }))).rejects.toHaveProperty('code', 'P2002');
    await expect(jobs.create(source())).rejects.toHaveProperty('code', 'P2002');
  });
  it('scopes reads to the owner and excludes internal fields', async () => {
    const job = await jobs.create(source());
    expect(await jobs.findOwned({ id: job.id, userId: other.user_id })).toBeNull();
    const view = await jobs.findOwned({ id: job.id, userId: owner.user_id });
    expect(view.id).toBe(job.id);
    expect(view).not.toHaveProperty('leaseToken');
    expect(view).not.toHaveProperty('transcript');
  });
  it('atomically claims each job only once under contention', async () => {
    const job = await jobs.create(source());
    const claims = await Promise.all(Array.from({ length: 4 }, () => jobs.claim({ leaseMs: 90_000, maxAttempts: 3 })));
    expect(claims.filter((entry) => entry?.id === job.id)).toHaveLength(1);
    expect((await jobs.findSource(source())).attempt).toBe(1);
  });
  it('fences expired workers and frees accounts after exhausted recovery', async () => {
    const created = await jobs.create(source());
    const job = await jobs.claim({ leaseMs: 90_000, maxAttempts: 3 });
    expect(job.id).toBe(created.id);
    await prisma.videoRecipeSummaryJob.update({ where: { id: job.id }, data: { leaseExpiresAt: new Date(0), attempt: 3 } });
    await expect(jobs.updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { stage: 'SUMMARIZING' } })).rejects.toHaveProperty('errorCode', 'VIDEO_JOB_LEASE_LOST');
    await jobs.recoverExpired({ maxAttempts: 3, retryMs: 1000 });
    const record = await jobs.findSource(source());
    expect(record).toMatchObject({ status: 'FAILED', activeUserId: null, leaseToken: null });
    await expect(jobs.create(source({ videoId: 'AnotherId12' }))).resolves.toBeTruthy();
  });
  it('requeues an expired claim with its transcript checkpoint intact', async () => {
    await jobs.create(source());
    const job = await jobs.claim({ leaseMs: 90_000, maxAttempts: 3 });
    const transcript = { language: 'vi', durationSeconds: 1, segments: [{ startSeconds: 0, endSeconds: 1, text: 'Xào nấm.' }] };
    await jobs.updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { transcript, stage: 'SUMMARIZING' } });
    await prisma.videoRecipeSummaryJob.update({ where: { id: job.id }, data: { leaseExpiresAt: new Date(0) } });
    await jobs.recoverExpired({ maxAttempts: 3, retryMs: 1 });
    expect(await jobs.findSource(source())).toMatchObject({ status: 'PENDING', transcript, leaseToken: null });
  });
  it('commits result and completion together and rejects stale completion', async () => {
    await jobs.create(source());
    const job = await jobs.claim({ leaseMs: 90_000, maxAttempts: 3 });
    const recipe = { title: null, ingredients: [], steps: [{ instruction: 'Xào nấm.', sourceSegmentIndexes: [0] }] };
    const summary = await jobs.complete({ job, recipe });
    expect((await jobs.findOwned({ id: job.id, userId: owner.user_id })).status).toBe('COMPLETED');
    expect(await summaries.findOwned({ id: summary.id, userId: owner.user_id })).toMatchObject({ recipe });
    expect(await summaries.findOwned({ id: summary.id, userId: other.user_id })).toBeNull();
    await expect(jobs.complete({ job, recipe })).rejects.toHaveProperty('errorCode', 'VIDEO_JOB_LEASE_LOST');
    expect(await prisma.videoRecipeSummary.count({ where: { jobId: job.id } })).toBe(1);
  });
});
