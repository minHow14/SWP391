// D:/SWP391/SWP391/server/tests/contentModerationDatabase.test.js
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import prisma from '../src/config/prisma.js';
import { contentModerationRepository as jobs } from '../src/repositories/contentModerationRepository.js';

let owner, other, post;
const config = { leaseMs: 60_000, maxAttempts: 3, retryMs: 1 };
const source = (patch = {}) => ({ userId: owner.user_id, postId: post.post_id,
  contentVersion: 1, title: 'Sườn chay', content: 'Sườn chay làm từ nấm và đậu nành.', ...patch });
beforeAll(async () => {
  const user = (name) => ({ email: `moderation-${randomUUID()}@example.invalid`, full_name: name, password_hash: 'unused-test-hash' });
  owner = await prisma.user.create({ data: user('Moderation owner') });
  other = await prisma.user.create({ data: user('Moderation other') });
  post = await prisma.post.create({ data: { author_id: owner.user_id, post_type: 'BLOG', status: 'PENDING_MODERATION', moderationVersion: 1 } });
});
beforeEach(async () => { await prisma.contentModerationJob.deleteMany({ where: { userId: owner.user_id } }); });
afterAll(async () => {
  await prisma.user.deleteMany({ where: { user_id: { in: [owner?.user_id, other?.user_id].filter(Boolean) } } });
  await prisma.$disconnect();
});

describe('content moderation persistence', () => {
  it('scopes job reads and excludes the content snapshot and lease', async () => {
    const created = await jobs.create(source());
    expect(await jobs.findOwned({ id: created.id, userId: other.user_id })).toBeNull();
    const visible = await jobs.findOwned({ id: created.id, userId: owner.user_id });
    expect(visible).toMatchObject({ id: created.id, status: 'PENDING' });
    for (const field of ['content', 'title', 'userId', 'leaseToken', 'leaseExpiresAt']) expect(visible).not.toHaveProperty(field);
    expect(await jobs.findOwned({ id: created.id, userId: other.user_id, isAdmin: true })).toBeTruthy();
  });
  it('prevents duplicate jobs for one content version', async () => {
    await jobs.create(source());
    await expect(jobs.create(source())).rejects.toHaveProperty('code', 'P2002');
  });
  it('claims one job once under competing workers', async () => {
    const created = await jobs.create(source());
    const claims = await Promise.all(Array.from({ length: 4 }, () => jobs.claim(config)));
    expect(claims.filter((job) => job?.id === created.id)).toHaveLength(1);
    expect(claims.find((job) => job?.id === created.id)).toMatchObject({ status: 'PROCESSING', attempt: 1 });
  });
  it('fences old workers after expiry and preserves the snapshot on recovery', async () => {
    await jobs.create(source());
    const job = await jobs.claim(config);
    await prisma.contentModerationJob.update({ where: { id: job.id }, data: { leaseExpiresAt: new Date(0) } });
    await expect(jobs.updateLeased({ job, data: { status: 'COMPLETED' } })).rejects.toHaveProperty('errorCode', 'MODERATION_LEASE_LOST');
    await jobs.recoverExpired(config);
    const record = await prisma.contentModerationJob.findUnique({ where: { id: job.id } });
    expect(record).toMatchObject({ status: 'PENDING', content: source().content, leaseToken: null });
  });
  it('fails exhausted jobs instead of retrying forever', async () => {
    const created = await jobs.create(source({ attempt: config.maxAttempts }));
    await jobs.recoverExpired(config);
    expect(await jobs.findOwned({ id: created.id, userId: owner.user_id })).toMatchObject({ status: 'FAILED', errorCode: 'MODERATION_RETRIES_EXHAUSTED' });
    expect(await jobs.claim(config)).toBeNull();
  });
  it('rolls back content changes if job persistence fails', async () => {
    const count = await prisma.post.count({ where: { author_id: owner.user_id } });
    await expect(jobs.transaction(async (tx) => {
      await tx.post.create({ data: { author_id: owner.user_id, post_type: 'BLOG' } });
      await jobs.create(source({ userId: -1 }), tx);
    })).rejects.toBeTruthy();
    expect(await prisma.post.count({ where: { author_id: owner.user_id } })).toBe(count);
  });
});
