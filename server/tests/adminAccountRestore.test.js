// D:/SWP391/SWP391/server/tests/adminAccountRestore.test.js
import './loadTestEnvironment.js';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';

let admin;
let member;
let authorization;
const createAccount = (role = 2) => prisma.user.create({ data: {
  email: `account-restore-${randomUUID()}@example.invalid`,
  full_name: 'Account restoration regression', password_hash: 'unused-test-hash', role,
} });
const changeStatus = (status) => request(app).patch(`/api/admin/users/${member.user_id}/status`)
  .set('Authorization', authorization).send({ status });
const deleteMember = () => request(app).delete(`/api/admin/users/${member.user_id}`)
  .set('Authorization', authorization);

beforeAll(async () => {
  admin = await createAccount(1);
  authorization = `Bearer ${generateToken({ user_id: admin.user_id, role: 1 })}`;
});
beforeEach(async () => { member = await createAccount(); });
afterEach(async () => {
  vi.useRealTimers();
  if (member) await prisma.user.delete({ where: { user_id: member.user_id } });
});
afterAll(async () => {
  if (admin) await prisma.user.delete({ where: { user_id: admin.user_id } });
  await prisma.$disconnect();
});

describe('admin account deletion and restoration', () => {
  it('locks and unlocks an existing member through the status endpoint', async () => {
    const locked = await changeStatus('LOCKED');
    expect(locked.status).toBe(200);
    expect(locked.body.data.status).toBe('LOCKED');
    const unlocked = await changeStatus('ACTIVE');
    expect(unlocked.status).toBe(200);
    expect(unlocked.body.data).toMatchObject({ status: 'ACTIVE', deleted_at: null });
  });

  it.each(['ACTIVE', 'LOCKED'])('preserves deletion metadata when generic status update requests %s', async (status) => {
    expect((await deleteMember()).status).toBe(200);
    const deleted = await prisma.user.findUnique({ where: { user_id: member.user_id } });
    const response = await changeStatus(status);
    expect(response.status).toBe(409);
    const unchanged = await prisma.user.findUnique({ where: { user_id: member.user_id } });
    expect(unchanged.status).toBe('DELETED');
    expect(unchanged.deleted_at).toEqual(deleted.deleted_at);
  });

  it('preserves the original deletion timestamp and content through repeated DELETE requests', async () => {
    const post = await prisma.post.create({ data: { author_id: member.user_id, post_type: 'BLOG' } });
    vi.useFakeTimers({ toFake: ['Date'] });
    expect((await deleteMember()).status).toBe(200);
    const first = await prisma.user.findUnique({ where: { user_id: member.user_id } });
    vi.setSystemTime(Date.now() + 1000);
    expect((await deleteMember()).status).toBe(200);
    const repeated = await prisma.user.findUnique({ where: { user_id: member.user_id } });
    expect(repeated.deleted_at).toEqual(first.deleted_at);
    const restored = await request(app).post(`/api/admin/users/${member.user_id}/restore`).set('Authorization', authorization);
    expect(restored.status).toBe(200);
    expect(await prisma.post.findUnique({ where: { post_id: post.post_id } })).toMatchObject({ status: 'PUBLISHED', deleted_at: null });
  });

  it('uses the account deletion cascade when DELETED is requested through PATCH', async () => {
    const post = await prisma.post.create({ data: { author_id: member.user_id, post_type: 'BLOG' } });
    const comment = await prisma.comment.create({ data: { user_id: member.user_id, post_id: post.post_id, content: 'Cascade regression' } });
    expect((await changeStatus('DELETED')).status).toBe(200);
    const deleted = await prisma.user.findUnique({ where: { user_id: member.user_id } });
    expect(await prisma.post.findUnique({ where: { post_id: post.post_id } })).toMatchObject({ status: 'DELETED', deleted_at: deleted.deleted_at });
    expect(await prisma.comment.findUnique({ where: { comment_id: comment.comment_id } })).toMatchObject({ status: 'DELETED', deleted_at: deleted.deleted_at });
  });

  it('cannot reactivate an account when deletion commits while PATCH is waiting to write', async () => {
    const lockingDb = new PrismaClient();
    let pending;
    const deletedAt = new Date();
    try {
      await lockingDb.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT user_id FROM users WHERE user_id = ${member.user_id} FOR UPDATE`;
        pending = changeStatus('ACTIVE').then((response) => response);
        await vi.waitFor(async () => {
          await tx.$executeRaw`SELECT pg_stat_clear_snapshot()`;
          const locks = await tx.$queryRaw`SELECT pid FROM pg_stat_activity
            WHERE wait_event_type = 'Lock' AND query LIKE '%users%' AND pid <> pg_backend_pid()`;
          expect(locks.length).toBeGreaterThan(0);
        }, { timeout: 3000, interval: 25 });
        await tx.user.update({ where: { user_id: member.user_id }, data: { status: 'DELETED', deleted_at: deletedAt } });
      });
    } finally { await lockingDb.$disconnect(); }
    const response = await pending;
    expect(response.status).toBe(409);
    expect(await prisma.user.findUnique({ where: { user_id: member.user_id } })).toMatchObject({ status: 'DELETED', deleted_at: deletedAt });
  });

  it('restores only content deleted with the account through the dedicated endpoint', async () => {
    const previousDeletion = new Date('2026-01-01T00:00:00.000Z');
    const post = await prisma.post.create({ data: { author_id: member.user_id, post_type: 'BLOG', status: 'PUBLISHED' } });
    const earlierPost = await prisma.post.create({ data: {
      author_id: member.user_id, post_type: 'BLOG', status: 'DELETED', deleted_at: previousDeletion,
    } });
    const comment = await prisma.comment.create({ data: { user_id: member.user_id, post_id: post.post_id, content: 'Restorable comment' } });
    const earlierComment = await prisma.comment.create({ data: {
      user_id: member.user_id, post_id: post.post_id, content: 'Previously removed comment', status: 'DELETED', deleted_at: previousDeletion,
    } });
    expect((await deleteMember()).status).toBe(200);
    const response = await request(app).post(`/api/admin/users/${member.user_id}/restore`).set('Authorization', authorization);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ status: 'ACTIVE', deleted_at: null });
    expect(await prisma.post.findUnique({ where: { post_id: post.post_id } })).toMatchObject({ status: 'PUBLISHED', deleted_at: null });
    expect(await prisma.comment.findUnique({ where: { comment_id: comment.comment_id } })).toMatchObject({ status: 'ACTIVE', deleted_at: null });
    expect(await prisma.post.findUnique({ where: { post_id: earlierPost.post_id } })).toMatchObject({ status: 'DELETED', deleted_at: previousDeletion });
    expect(await prisma.comment.findUnique({ where: { comment_id: earlierComment.comment_id } })).toMatchObject({ status: 'DELETED', deleted_at: previousDeletion });
  });
});
