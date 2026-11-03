// D:/SWP391/SWP391/server/tests/adminPostNotification.test.js
import './loadTestEnvironment.js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { notificationRepository } from '../src/repositories/notification.repository.js';

let owner, admin, reporter;
let adminToken, ownerToken, reporterToken;
const createdPostIds = [];

beforeAll(async () => {
  const createUser = (role) => prisma.user.create({ data: {
    email: `post-removal-${randomUUID()}@example.invalid`,
    full_name: 'Post removal integration test', password_hash: 'unused-test-hash', role,
  } });
  owner = await createUser(2);
  admin = await createUser(1);
  reporter = await createUser(2);
  adminToken = generateToken({ user_id: admin.user_id });
  ownerToken = generateToken({ user_id: owner.user_id });
  reporterToken = generateToken({ user_id: reporter.user_id });
});

beforeEach(async () => {
  await prisma.notification.deleteMany({ where: { user_id: owner.user_id } });
});

afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.report.deleteMany({ where: { post_id: { in: createdPostIds } } });
  await prisma.user.deleteMany({ where: {
    user_id: { in: [owner?.user_id, admin?.user_id, reporter?.user_id].filter(Boolean) },
  } });
  await prisma.$disconnect();
});

async function createPost(status = 'PUBLISHED', postType = 'BLOG') {
  const post = await prisma.post.create({ data: {
    author_id: owner.user_id, post_type: postType, status,
    ...(postType === 'BLOG' && { blog: { create: {
      title: 'Bài viết kiểm thử thông báo gỡ bài', content: 'Nội dung kiểm thử gỡ bài bởi quản trị viên.',
    } } }),
  } });
  createdPostIds.push(post.post_id);
  return post;
}

async function expectOwnerNotification(post) {
  const response = await request(app).get('/api/v1/notifications')
    .set('Authorization', `Bearer ${ownerToken}`);
  expect(response.status).toBe(200);
  expect(response.body.data.unreadCount).toBe(1);
  expect(response.body.data.notifications).toHaveLength(1);
  expect(response.body.data.notifications[0]).toMatchObject({
    user_id: owner.user_id, is_read: false,
    message: expect.stringContaining(`#${post.post_id}`),
  });
  expect(response.body.data.notifications[0].message).toContain('quản trị viên');
  const otherResponse = await request(app).get('/api/v1/notifications')
    .set('Authorization', `Bearer ${reporterToken}`);
  expect(otherResponse.body.data.notifications.some((item) => item.content.includes(`#${post.post_id}`))).toBe(false);
}

describe('notifications when an admin removes a post', () => {
  it.each(['BLOG', 'VIDEO'])('keeps an unread owner notification after permanent %s deletion', async (postType) => {
    const post = await createPost('PUBLISHED', postType);
    const response = await request(app).delete(`/api/v1/admin/posts/${post.post_id}?permanent=true`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(await prisma.post.findUnique({ where: { post_id: post.post_id } })).toBeNull();
    await expectOwnerNotification(post);
  });

  it('notifies once when status changes to DELETED, including a repeated request', async () => {
    const post = await createPost();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await request(app).patch(`/api/v1/admin/posts/${post.post_id}/status`)
        .set('Authorization', `Bearer ${adminToken}`).send({ status: 'DELETED' });
      expect(response.status).toBe(200);
    }
    await expectOwnerNotification(post);
  });

  it('notifies the author when an admin rejects a flagged post', async () => {
    const post = await createPost('HIDDEN_BY_AI');
    const response = await request(app).post('/api/v1/admin/moderation/resolve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ entityType: 'POST', entityId: post.post_id, action: 'REJECT' });
    expect(response.status).toBe(200);
    await expectOwnerNotification(post);
  });

  it('notifies the author once when a report removes their post', async () => {
    const post = await createPost();
    const report = await prisma.report.create({ data: {
      post_id: post.post_id, reporter_id: reporter.user_id, reason: 'Kiểm thử thông báo gỡ bài qua báo cáo',
    } });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await request(app).patch(`/api/v1/admin/reports/${report.report_id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'RESOLVED', resolutionAction: 'HIDE_CONTENT' });
      expect(response.status).toBe(200);
    }
    await expectOwnerNotification(post);
  });

  it.each(['blogs', 'videos'])('notifies when an admin uses the community %s delete route', async (route) => {
    const post = await createPost('PUBLISHED', route === 'blogs' ? 'BLOG' : 'VIDEO');
    const response = await request(app).delete(`/api/v1/${route}/${post.post_id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    await expectOwnerNotification(post);
  });

  it('does not send an admin removal notification when the author deletes their own post', async () => {
    const post = await createPost();
    const response = await request(app).delete(`/api/v1/blogs/${post.post_id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(response.status).toBe(200);
    expect(await prisma.notification.count({ where: { user_id: owner.user_id } })).toBe(0);
  });

  it('rejects a non-admin deletion without notifying the author', async () => {
    const post = await createPost();
    const response = await request(app).delete(`/api/v1/admin/posts/${post.post_id}?permanent=true`)
      .set('Authorization', `Bearer ${reporterToken}`);
    expect(response.status).toBe(403);
    expect(await prisma.notification.count({ where: { user_id: owner.user_id } })).toBe(0);
    expect(await prisma.post.findUnique({ where: { post_id: post.post_id } })).toHaveProperty('status', 'PUBLISHED');
  });

  it('rolls back permanent deletion when notification persistence fails', async () => {
    const post = await createPost();
    const failure = vi.spyOn(notificationRepository, 'create').mockRejectedValueOnce(new Error('Notification write failed'));
    try {
      const response = await request(app).delete(`/api/v1/admin/posts/${post.post_id}?permanent=true`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(500);
      expect(await prisma.post.findUnique({ where: { post_id: post.post_id } })).toHaveProperty('status', 'PUBLISHED');
      expect(await prisma.blog.findUnique({ where: { post_id: post.post_id } })).not.toBeNull();
      expect(await prisma.notification.count({ where: { user_id: owner.user_id } })).toBe(0);
    } finally {
      failure.mockRestore();
    }
  });
});
