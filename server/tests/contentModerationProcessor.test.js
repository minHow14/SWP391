// D:/SWP391/SWP391/server/tests/contentModerationProcessor.test.js
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import prisma from '../src/config/prisma.js';
import { contentModerationRepository as jobs } from '../src/repositories/contentModerationRepository.js';
import { processContentModerationJob } from '../src/services/contentModerationProcessor.js';
import { commentService } from '../src/services/comment.service.js';

let owner, post;
const config = { leaseMs: 60_000, maxAttempts: 3, retryMs: 1 };
const result = { decision: 'ALLOW', reason: 'Nội dung về món chay.', categories: [], evidence: [], modelName: 'provider-model', policyVersion: '1' };
const ai = { moderate: async () => result };
async function claimedJob(patch = {}) {
  await jobs.create({ userId: owner.user_id, postId: post.post_id, contentVersion: 1,
    title: 'Sườn chay', content: 'Sườn chay từ nấm.', ...patch });
  return jobs.claim(config);
}
beforeAll(async () => {
  owner = await prisma.user.create({ data: { email: `moderation-processor-${randomUUID()}@example.invalid`,
    full_name: 'Moderation processor', password_hash: 'unused-test-hash' } });
  post = await prisma.post.create({ data: { author_id: owner.user_id, post_type: 'BLOG', status: 'PENDING_MODERATION', moderationVersion: 1 } });
});
beforeEach(async () => {
  await prisma.contentModerationJob.deleteMany({ where: { userId: owner.user_id } });
  await prisma.post.update({ where: { post_id: post.post_id }, data: { status: 'PENDING_MODERATION', moderationVersion: 1, deleted_at: null } });
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { user_id: owner?.user_id ?? -1 } });
  await prisma.$disconnect();
});

describe('moderation result application', () => {
  it('publishes the checked version and commits the result with completion', async () => {
    const job = await claimedJob();
    expect(await processContentModerationJob(job, { ai, config })).toMatchObject({ status: 'COMPLETED', applied: true });
    expect(await prisma.post.findUnique({ where: { post_id: post.post_id } })).toMatchObject({ status: 'PUBLISHED' });
    expect(await jobs.findOwned({ id: job.id, userId: owner.user_id })).toMatchObject({ status: 'COMPLETED', applied: true, result });
    await expect(processContentModerationJob(job, { ai, config })).rejects.toHaveProperty('errorCode', 'MODERATION_LEASE_LOST');
  });
  it('does not apply a result from before a newer edit', async () => {
    const job = await claimedJob();
    await prisma.post.update({ where: { post_id: post.post_id }, data: { moderationVersion: 2 } });
    expect(await processContentModerationJob(job, { ai, config })).toMatchObject({ status: 'COMPLETED', applied: false });
    expect(await prisma.post.findUnique({ where: { post_id: post.post_id } })).toMatchObject({ status: 'PENDING_MODERATION', moderationVersion: 2 });
  });
  it.each(['HIDDEN', 'DELETED', 'PUBLISHED'])('preserves an administrator decision %s', async (status) => {
    const job = await claimedJob();
    await prisma.post.update({ where: { post_id: post.post_id }, data: { status } });
    expect(await processContentModerationJob(job, { ai, config })).toMatchObject({ applied: false });
    expect((await prisma.post.findUnique({ where: { post_id: post.post_id } })).status).toBe(status);
  });
  it('retries upstream outages without publishing and eventually fails', async () => {
    const failingAi = { moderate: async () => { throw Object.assign(new Error('safe failure'), { errorCode: 'MODERATION_AI_UNAVAILABLE', retryable: true }); } };
    const job = await claimedJob();
    expect(await processContentModerationJob(job, { ai: failingAi, config })).toMatchObject({ status: 'RETRY_SCHEDULED' });
    expect((await prisma.post.findUnique({ where: { post_id: post.post_id } })).status).toBe('PENDING_MODERATION');
    await prisma.contentModerationJob.update({ where: { id: job.id }, data: { attempt: 2, availableAt: new Date(0) } });
    const lastAttempt = await jobs.claim(config);
    expect(await processContentModerationJob(lastAttempt, { ai: failingAi, config })).toMatchObject({ status: 'FAILED' });
  });
  it('flags a comment only and leaves its parent published', async () => {
    await prisma.post.update({ where: { post_id: post.post_id }, data: { status: 'PUBLISHED' } });
    const comment = await prisma.comment.create({ data: { post_id: post.post_id, user_id: owner.user_id,
      content: 'Nội dung cần xem xét.', status: 'PENDING_MODERATION', moderationVersion: 1 } });
    const job = await claimedJob({ postId: null, commentId: comment.comment_id, title: null, content: comment.content });
    const reviewAi = { moderate: async () => ({ ...result, decision: 'REVIEW', categories: ['SPAM'], evidence: ['Nội dung'] }) };
    await processContentModerationJob(job, { ai: reviewAi, config });
    expect(await prisma.comment.findUnique({ where: { comment_id: comment.comment_id } })).toMatchObject({ status: 'HIDDEN_BY_AI', is_flagged_by_ai: true });
    expect((await prisma.post.findUnique({ where: { post_id: post.post_id } })).status).toBe('PUBLISHED');
    await prisma.comment.delete({ where: { comment_id: comment.comment_id } });
  });
  it('preserves a checked comment during parent moderation and reveals it only after parent publication', async () => {
    const comment = await prisma.comment.create({ data: { post_id: post.post_id, user_id: owner.user_id,
      content: 'Bình luận chờ.', status: 'PENDING_MODERATION', moderationVersion: 1 } });
    const job = await claimedJob({ postId: null, commentId: comment.comment_id, content: comment.content });
    expect(await processContentModerationJob(job, { ai, config })).toMatchObject({ applied: true });
    expect((await prisma.comment.findUnique({ where: { comment_id: comment.comment_id } })).status).toBe('ACTIVE');
    await expect(commentService.getCommentsByPost(post.post_id)).rejects.toHaveProperty('statusCode', 404);
    await prisma.post.update({ where: { post_id: post.post_id }, data: { status: 'PUBLISHED' } });
    expect((await commentService.getCommentsByPost(post.post_id)).some((entry) => entry.comment_id === comment.comment_id)).toBe(true);
    await prisma.comment.delete({ where: { comment_id: comment.comment_id } });
  });
});
