// D:/SWP391/SWP391/server/tests/contentModerationFlow.test.js
import http from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { z } from 'zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.CONTENT_MODERATION_ENABLED = 'true'; });
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { createContentModerationAiService } from '../src/services/contentModerationAiService.js';
import { processContentModerationJob } from '../src/services/contentModerationProcessor.js';
import { runContentModerationWorker } from '../src/workers/contentModerationWorker.js';
import { createBlogSchema, updateBlogSchema } from '../src/validators/blog.validator.js';

const INTERNAL_KEY = 'moderation-flow-test-key-32-characters';
const config = { enabled: true, leaseMs: 60_000, maxAttempts: 2, retryMs: 1, pollMs: 1 };
const allowed = { decision: 'ALLOW', reason: 'Nguyên liệu được mô tả là thực vật.', categories: [],
  evidence: [], modelName: 'integration-test-provider', policyVersion: 'integration-test-policy' };
let owner, admin, ownerToken, adminToken, parent, endpoint, ai, upstream, received;
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const apiDocument = JSON.parse(readFileSync(new URL('../../docs/content-moderation-openapi.json', import.meta.url), 'utf8'));

function resolveSchema(schema) {
  if (Array.isArray(schema)) return schema.map(resolveSchema);
  if (!schema || typeof schema !== 'object') return schema;
  if (schema.$ref) return resolveSchema(schema.$ref.split('/').slice(1).reduce((value, key) => value[key], apiDocument));
  // JSON Schema defaults are annotations; wire validation must not fill missing required fields.
  return Object.fromEntries(Object.entries(schema).filter(([key]) => key !== 'default').map(([key, value]) => [key, resolveSchema(value)]));
}
const contract = (name) => z.fromJSONSchema(resolveSchema(apiDocument.components.schemas[name]));

async function respondToWorker(req, res) {
  let content = '';
  for await (const chunk of req) content += chunk;
  received.push({ path: req.url, key: req.headers['x-internal-api-key'], body: JSON.parse(content) });
  res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
  const body = upstream.status === 200 ? { success: true, message: 'Test verdict.', data: upstream.data,
    meta: { requestId: req.headers['x-request-id'] } } : { success: false, message: 'private upstream failure details' };
  if (upstream.status === 200) contract('ModerationResponse').parse(body);
  res.end(JSON.stringify(body));
}

async function finishQueuedWork() {
  const controller = new AbortController();
  const watchdog = setTimeout(() => controller.abort(), 5_000);
  try {
    await runContentModerationWorker({ config, signal: controller.signal,
      log: { info() {}, error() {} },
      processJob: async (job, options) => {
        const result = await processContentModerationJob(job, { ...options, ai });
        if (['COMPLETED', 'FAILED'].includes(result.status)) controller.abort();
        return result;
      } });
  } finally { clearTimeout(watchdog); }
}

beforeAll(async () => {
  const user = (role) => ({ email: `moderation-flow-${randomUUID()}@example.invalid`,
    full_name: 'Moderation flow test', password_hash: 'unused-test-hash', role });
  owner = await prisma.user.create({ data: user(2) });
  admin = await prisma.user.create({ data: user(1) });
  ownerToken = generateToken({ user_id: owner.user_id });
  adminToken = generateToken({ user_id: admin.user_id });
  parent = await prisma.post.create({ data: { author_id: admin.user_id, post_type: 'BLOG',
    blog: { create: { title: 'Bài viết công khai cho test bình luận', content: 'Chia sẻ món ăn từ thực vật.' } } } });
  endpoint = http.createServer((req, res) => { respondToWorker(req, res).catch(() => { res.destroy(); }); });
  endpoint.listen(0, '127.0.0.1');
  await once(endpoint, 'listening');
  ai = createContentModerationAiService({ config: { url: `http://127.0.0.1:${endpoint.address().port}`, internalApiKey: INTERNAL_KEY }, timeoutMs: 1_000 });
});

beforeEach(async () => {
  received = [];
  upstream = { status: 200, data: allowed };
  await prisma.post.deleteMany({ where: { author_id: owner.user_id } });
  await prisma.comment.deleteMany({ where: { user_id: owner.user_id } });
});

afterAll(async () => {
  if (endpoint) { endpoint.closeAllConnections(); await new Promise((resolve) => endpoint.close(resolve)); }
  await prisma.user.deleteMany({ where: { user_id: { in: [owner?.user_id, admin?.user_id].filter(Boolean) } } });
  await prisma.$disconnect();
});

const createBlog = () => request(app).post('/api/v1/blogs').set(auth(ownerToken))
  .send({ title: 'Sườn chay từ nấm', content: 'Sườn chay làm từ nấm và đậu nành.' });
const ownerJob = (id) => request(app).get(`/api/v1/content-moderation-jobs/${id}`).set(auth(ownerToken));

describe('moderation through APIs, database, worker and real internal HTTP transport', () => {
  it('documents the attachment type default accepted by both create and edit validators', () => {
    const body = { title: 'Sườn chay', content: 'Món chay từ nấm.', attachments: [{ url: '/uploads/attachment-contract.webp' }] };
    expect(createBlogSchema.parse(body).attachments[0].type).toBe('image');
    contract('BlogCreate').parse(body);
    expect(updateBlogSchema.parse(body).attachments[0].type).toBe('image');
    contract('BlogUpdate').parse(body);
  });
  it('returns 202 before processing, then publishes and restores the saved result for the owner', async () => {
    const submitted = await createBlog();
    expect(submitted.status).toBe(202);
    const { jobId, blog } = submitted.body.data;
    contract('BlogReceipt').parse(submitted.body.data);
    expect((await request(app).get(`/api/v1/blogs/${blog.post_id}`)).status).toBe(404);
    await finishQueuedWork();
    expect((await ownerJob(jobId)).body.data.job).toMatchObject({ status: 'COMPLETED', applied: true, result: allowed });
    expect((await request(app).get(`/api/v1/blogs/${blog.post_id}`)).status).toBe(200);
    const restored = await request(app).get('/api/v1/content-moderation-jobs').set(auth(ownerToken));
    expect(restored.body.meta.pending).toBe(0);
    expect(restored.body.data.items[0]).toMatchObject({ id: jobId, isCurrent: true, targetStatus: 'PUBLISHED' });
    contract('OwnerJob').parse(restored.body.data.items[0]);
    contract('ModerationRequest').parse(received[0].body);
    expect(received).toEqual([{ path: '/api/v1/content-moderations', key: INTERNAL_KEY,
      body: { jobId, contentType: 'POST', contentVersion: 1, title: blog.title, content: blog.content } }]);
  });

  it('keeps a flagged comment private until Admin approval without hiding its published parent', async () => {
    upstream.data = { ...allowed, decision: 'REVIEW', reason: 'Nội dung quảng bá món từ thịt.',
      categories: ['ANIMAL_MEAT_PROMOTION'], evidence: ['sườn heo'] };
    const submitted = await request(app).post('/api/v1/comments').set(auth(ownerToken))
      .send({ post_id: parent.post_id, content: 'Mời mua sườn heo nướng.' });
    expect(submitted.status).toBe(202);
    contract('CommentReceipt').parse(submitted.body.data);
    await finishQueuedWork();
    const commentId = submitted.body.data.comment.comment_id;
    const url = `/api/v1/comments/post/${parent.post_id}`;
    expect((await request(app).get(url)).body.data.comments).toEqual([]);
    expect((await request(app).get(`/api/v1/blogs/${parent.post_id}`)).status).toBe(200);
    const queue = await request(app).get('/api/v1/admin/moderation/flagged').set(auth(adminToken));
    contract('AdminQueue').parse(queue.body.data);
    expect(queue.body.data.comments.find((item) => item.comment_id === commentId)?.moderation?.result).toEqual(upstream.data);
    const approved = await request(app).post('/api/v1/admin/moderation/resolve').set(auth(adminToken))
      .send({ entityType: 'COMMENT', entityId: commentId, action: 'APPROVE', contentVersion: 1 });
    expect(approved.status).toBe(200);
    expect((await request(app).get(url)).body.data.comments.some((item) => item.comment_id === commentId)).toBe(true);
    expect((await prisma.post.findUnique({ where: { post_id: parent.post_id } })).status).toBe('PUBLISHED');
  });

  it.each([[401, 1, 'MODERATION_AI_AUTH_FAILED'], [503, 2, 'MODERATION_AI_UNAVAILABLE']])(
    'keeps content private after HTTP %s and exposes a sanitized actionable failure', async (status, attempts, errorCode) => {
      upstream.status = status;
      const submitted = await createBlog();
      const { jobId, blog } = submitted.body.data;
      await finishQueuedWork();
      const job = (await ownerJob(jobId)).body.data.job;
      contract('ModerationJob').parse(job);
      expect(job).toMatchObject({ status: 'FAILED', applied: false, errorCode, result: null });
      expect(JSON.stringify(job)).not.toContain('private upstream failure details');
      expect(received).toHaveLength(attempts);
      expect((await request(app).get(`/api/v1/blogs/${blog.post_id}`)).status).toBe(404);
      expect((await request(app).get('/api/v1/admin/moderation/flagged').set(auth(ownerToken))).status).toBe(403);
      const queue = await request(app).get('/api/v1/admin/moderation/flagged').set(auth(adminToken));
      expect(queue.body.data.posts.find((item) => item.post_id === blog.post_id)?.moderation)
        .toMatchObject({ status: 'FAILED', errorCode });
    });
});
