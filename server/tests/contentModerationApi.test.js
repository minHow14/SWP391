// D:/SWP391/SWP391/server/tests/contentModerationApi.test.js
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
vi.hoisted(() => { process.env.CONTENT_MODERATION_ENABLED = 'true'; });
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { contentModerationRepository as jobs } from '../src/repositories/contentModerationRepository.js';
import { getAiFlaggedContent, resolveAiFlaggedItem } from '../src/services/admin.service.js';
import { processContentModerationJob } from '../src/services/contentModerationProcessor.js';

let owner, other, admin, token, otherToken, adminToken, parent;
const text = { title: 'Sườn chay từ nấm', content: 'Chia sẻ cách làm sườn chay từ nấm và đậu nành.' };
const postBlog = (body = text) => request(app).post('/api/v1/blogs').set('Authorization', `Bearer ${token}`).send(body);
const putBlog = (id, body) => request(app).put(`/api/v1/blogs/${id}`).set('Authorization', `Bearer ${token}`).send(body);
beforeAll(async () => {
  const user = (name, role = 2) => ({ email: `moderation-api-${randomUUID()}@example.invalid`,
    full_name: name, password_hash: 'unused-test-hash', role });
  owner = await prisma.user.create({ data: user('Moderation author') });
  other = await prisma.user.create({ data: user('Moderation other') });
  admin = await prisma.user.create({ data: user('Moderation admin', 1) });
  token = generateToken({ user_id: owner.user_id });
  otherToken = generateToken({ user_id: other.user_id });
  adminToken = generateToken({ user_id: admin.user_id });
  parent = await prisma.post.create({ data: { author_id: other.user_id, post_type: 'BLOG',
    blog: { create: { title: text.title, content: text.content } } } });
});
beforeEach(async () => {
  await prisma.post.deleteMany({ where: { author_id: owner.user_id } });
  await prisma.comment.deleteMany({ where: { user_id: owner.user_id } });
  await prisma.post.update({ where: { post_id: parent.post_id }, data: { status: 'PUBLISHED', deleted_at: null } });
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { user_id: { in: [owner?.user_id, other?.user_id, admin?.user_id].filter(Boolean) } } });
  await prisma.$disconnect();
});

describe('moderated content API when enabled', () => {
  it.each([['POST', 'APPROVE'], ['POST', 'REJECT'], ['COMMENT', 'APPROVE'], ['COMMENT', 'REJECT']])(
    'rejects a versionless %s %s decision after the author changes the content', async (entityType, action) => {
      let entityId;
      if (entityType === 'POST') {
        const submitted = await postBlog();
        entityId = submitted.body.data.blog.post_id;
        await putBlog(entityId, { content: 'Phiên bản mới cần được xem lại trước khi quyết định.' });
      } else {
        const submitted = await request(app).post('/api/v1/comments').set('Authorization', `Bearer ${token}`)
          .send({ post_id: parent.post_id, content: 'Bình luận chờ kiểm tra.' });
        entityId = submitted.body.data.comment.comment_id;
        await request(app).put(`/api/v1/comments/${entityId}`).set('Authorization', `Bearer ${token}`)
          .send({ content: 'Bình luận đã thay đổi sau khi Admin mở hàng chờ.' });
      }
      const decision = await request(app).post('/api/v1/admin/moderation/resolve').set('Authorization', `Bearer ${adminToken}`)
        .send({ entityType, entityId, action });
      expect(decision.status).toBe(409);
      const current = entityType === 'POST' ? await prisma.post.findUnique({ where: { post_id: entityId } }) :
        await prisma.comment.findUnique({ where: { comment_id: entityId } });
      expect(current).toMatchObject({ moderationVersion: 2, status: 'PENDING_MODERATION', deleted_at: null });
    });
  it.each(['POST', 'COMMENT'])('retains versionless decisions for legacy %s at version zero only', async (entityType) => {
    const legacy = entityType === 'POST' ? await prisma.post.create({ data: { author_id: owner.user_id,
      post_type: 'BLOG', status: 'HIDDEN_BY_AI' } }) : await prisma.comment.create({ data: { user_id: owner.user_id,
      post_id: parent.post_id, content: 'Bình luận từ luồng cũ.', status: 'HIDDEN_BY_AI', is_flagged_by_ai: true } });
    const entityId = legacy.post_type ? legacy.post_id : legacy.comment_id;
    const decision = await request(app).post('/api/v1/admin/moderation/resolve').set('Authorization', `Bearer ${adminToken}`)
      .send({ entityType, entityId, action: 'APPROVE' });
    expect(decision.status).toBe(200);
  });
  it.each(['POST', 'COMMENT'])('does not resurrect a deleted %s from an already-open approval', async (entityType) => {
    let entityId;
    if (entityType === 'POST') {
      const { body } = await postBlog();
      entityId = body.data.blog.post_id;
      await request(app).delete(`/api/v1/blogs/${entityId}`).set('Authorization', `Bearer ${token}`);
    } else {
      const reply = await request(app).post('/api/v1/comments').set('Authorization', `Bearer ${token}`)
        .send({ post_id: parent.post_id, content: 'Bình luận được tác giả xóa trước khi Admin duyệt.' });
      entityId = reply.body.data.comment.comment_id;
      await request(app).delete(`/api/v1/comments/${entityId}`).set('Authorization', `Bearer ${token}`);
    }
    const approval = await request(app).post('/api/v1/admin/moderation/resolve').set('Authorization', `Bearer ${adminToken}`)
      .send({ entityType, entityId, action: 'APPROVE', contentVersion: 1 });
    expect(approval.status).toBe(409);
    const record = entityType === 'POST' ? await prisma.post.findUnique({ where: { post_id: entityId } }) :
      await prisma.comment.findUnique({ where: { comment_id: entityId } });
    expect(record.status).toBe('DELETED');
    expect(record.deleted_at).not.toBeNull();
  });
  it('rejects an administrator decision based on an obsolete content version', async () => {
    const { body } = await postBlog();
    const id = body.data.blog.post_id;
    await putBlog(id, { content: 'Nội dung đã thay đổi và cần được xem lại.' });
    const reply = await request(app).post('/api/v1/admin/moderation/resolve').set('Authorization', `Bearer ${adminToken}`)
      .send({ entityType: 'POST', entityId: id, action: 'APPROVE', contentVersion: 1 });
    expect(reply.status).toBe(409);
    expect((await prisma.post.findUnique({ where: { post_id: id } })).status).toBe('PENDING_MODERATION');
  });
  it('restores paginated owner-only job states with a pending count and safe preview', async () => {
    const { body } = await postBlog();
    const url = '/api/v1/content-moderation-jobs';
    expect((await request(app).get(url)).status).toBe(401);
    const own = await request(app).get(`${url}?page=1&limit=1`).set('Authorization', `Bearer ${token}`);
    expect(own.status).toBe(200);
    expect(own.body.meta).toMatchObject({ page: 1, limit: 1, total: 1, pending: 1 });
    expect(own.body.data.items[0]).toMatchObject({ id: body.data.jobId, preview: text.title,
      targetStatus: 'PENDING_MODERATION', isCurrent: true });
    for (const key of ['title', 'content', 'userId', 'leaseToken', 'post', 'comment']) expect(own.body.data.items[0]).not.toHaveProperty(key);
    const otherList = await request(app).get(url).set('Authorization', `Bearer ${otherToken}`);
    expect(otherList.body.data.items).toEqual([]);
    for (const query of ['limit=101', 'page=0', `userId=${owner.user_id}`]) {
      expect((await request(app).get(`${url}?${query}`).set('Authorization', `Bearer ${token}`)).status).toBe(400);
    }
  });
  it('attaches only the current saved result to the administrator queue', async () => {
    const { body } = await postBlog();
    const id = body.data.blog.post_id;
    const pending = await getAiFlaggedContent();
    expect(pending.posts.find((post) => post.post_id === id)?.moderation?.status).toBe('PENDING');
    const job = await jobs.claim({ leaseMs: 60_000, maxAttempts: 3 });
    const result = { decision: 'REVIEW', reason: 'Lý do kiểm duyệt trong test.', categories: ['SPAM'],
      evidence: ['sườn chay'], modelName: 'provider-model', policyVersion: 'test-policy' };
    await processContentModerationJob(job, { ai: { moderate: async () => result } });
    expect((await getAiFlaggedContent()).posts.find((post) => post.post_id === id)?.moderation?.result).toEqual(result);
    await putBlog(id, { content: 'Nội dung mới vẫn giữ trạng thái ẩn để Admin xem xét.' });
    expect((await getAiFlaggedContent()).posts.find((post) => post.post_id === id)?.moderation).toBeNull();
  });
  it('atomically creates pending content and a job, ignoring forged publication status', async () => {
    const res = await postBlog({ ...text, status: 'PUBLISHED', moderationVersion: 999 });
    expect(res.status).toBe(202);
    expect(res.body.data).toMatchObject({ moderationStatus: 'PENDING', blog: { status: 'PENDING_MODERATION', moderationVersion: 1 } });
    expect(res.body.data.jobId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await prisma.contentModerationJob.findUnique({ where: { id: res.body.data.jobId } }))
      .toMatchObject({ userId: owner.user_id, title: text.title, content: text.content, contentVersion: 1 });
    const feed = await request(app).get('/api/v1/blogs');
    expect(feed.body.data.blogs.some((blog) => blog.post_id === res.body.data.blog.post_id)).toBe(false);
  });
  it('protects pending details while letting the owner and admin preview', async () => {
    const { body } = await postBlog();
    const url = `/api/v1/blogs/${body.data.blog.post_id}`;
    expect((await request(app).get(url)).status).toBe(404);
    expect((await request(app).get(url).set('Authorization', `Bearer ${otherToken}`)).status).toBe(404);
    expect((await request(app).get(url).set('Authorization', `Bearer ${token}`)).status).toBe(200);
    expect((await request(app).get(url).set('Authorization', `Bearer ${adminToken}`)).status).toBe(200);
  });
  it('exposes job state to the owner/admin only without private snapshot or lease', async () => {
    const { body } = await postBlog();
    const url = `/api/v1/content-moderation-jobs/${body.data.jobId}`;
    expect((await request(app).get(url)).status).toBe(401);
    expect((await request(app).get(url).set('Authorization', `Bearer ${otherToken}`)).status).toBe(404);
    const own = await request(app).get(url).set('Authorization', `Bearer ${token}`);
    expect(own.status).toBe(200);
    expect(own.body.data.job).toMatchObject({ status: 'PENDING' });
    for (const key of ['userId', 'content', 'title', 'leaseToken']) expect(own.body.data.job).not.toHaveProperty(key);
    expect((await request(app).get(url).set('Authorization', `Bearer ${adminToken}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/content-moderation-jobs/invalid').set('Authorization', `Bearer ${token}`)).status).toBe(400);
  });
  it('rechecks changed text and does not queue unchanged text', async () => {
    const { body } = await postBlog();
    const id = body.data.blog.post_id;
    const unchanged = await putBlog(id, text);
    expect(unchanged.status).toBe(200);
    const edited = await putBlog(id, { content: 'Sườn chay từ đậu nành, không dùng thịt động vật.' });
    expect(edited.status).toBe(202);
    const records = await prisma.contentModerationJob.findMany({ where: { postId: id }, orderBy: { contentVersion: 'asc' } });
    expect(records).toHaveLength(2);
    expect(records[1]).toMatchObject({ contentVersion: 2, title: text.title, content: 'Sườn chay từ đậu nành, không dùng thịt động vật.' });
  });
  it('preserves snapshots under concurrent edits', async () => {
    const { body } = await postBlog();
    const id = body.data.blog.post_id;
    const replies = await Promise.all([putBlog(id, { title: 'Sườn chay mới' }), putBlog(id, { content: 'Công thức từ nấm và đậu.' })]);
    expect(replies.map((reply) => reply.status)).toEqual([202, 202]);
    const blog = await prisma.blog.findUnique({ where: { post_id: id }, include: { post: true } });
    const latest = await prisma.contentModerationJob.findFirst({ where: { postId: id }, orderBy: { contentVersion: 'desc' } });
    expect(latest).toMatchObject({ title: blog.title, content: blog.content, contentVersion: blog.post.moderationVersion });
  });
  it('rolls back the blog when saving its moderation job fails', async () => {
    const spy = vi.spyOn(jobs, 'create').mockRejectedValueOnce(new Error('Test persistence failure'));
    try {
      expect((await postBlog()).status).toBe(500);
      expect(await prisma.post.count({ where: { author_id: owner.user_id } })).toBe(0);
    } finally { spy.mockRestore(); }
  });
  it('keeps comments pending without sending their text in a notification', async () => {
    const before = await prisma.notification.count({ where: { user_id: other.user_id } });
    const res = await request(app).post('/api/v1/comments').set('Authorization', `Bearer ${token}`)
      .send({ post_id: parent.post_id, content: 'Sườn chay này làm từ nguyên liệu gì?' });
    expect(res.status).toBe(202);
    expect(res.body.data.comment.status).toBe('PENDING_MODERATION');
    expect(await prisma.notification.count({ where: { user_id: other.user_id } })).toBe(before);
    const listing = await request(app).get(`/api/v1/comments/post/${parent.post_id}`);
    expect(listing.body.data.comments).toEqual([]);
    const edited = await request(app).put(`/api/v1/comments/${res.body.data.comment.comment_id}`)
      .set('Authorization', `Bearer ${token}`).send({ content: 'Mình thấy thành phần gồm nấm và đậu.' });
    expect(edited.status).toBe(202);
    expect(edited.body.data.comment.moderationVersion).toBe(2);
  });
  it('blocks public comment reads, comment creation and voting on a pending post', async () => {
    const { body } = await postBlog();
    const id = body.data.blog.post_id;
    expect((await request(app).get(`/api/v1/comments/post/${id}`)).status).toBe(404);
    expect((await request(app).post('/api/v1/comments').set('Authorization', `Bearer ${otherToken}`)
      .send({ post_id: id, content: 'Bình luận vào nội dung chưa công khai.' })).status).toBe(404);
    expect((await request(app).post('/api/v1/votes').set('Authorization', `Bearer ${otherToken}`)
      .send({ post_id: id, vote_type: 'UPVOTE' })).status).toBe(404);
  });
  it('does not reveal hidden content through report responses', async () => {
    const { body } = await postBlog();
    const postReport = await request(app).post('/api/v1/reports').set('Authorization', `Bearer ${otherToken}`)
      .send({ postId: body.data.blog.post_id, reason: 'Không được đọc nội dung đang chờ qua báo cáo.' });
    expect(postReport.status).toBe(404);
    const comment = await prisma.comment.create({ data: { post_id: parent.post_id, user_id: owner.user_id,
      content: 'Nội dung bình luận đang chờ.', status: 'PENDING_MODERATION' } });
    const commentReport = await request(app).post('/api/v1/reports').set('Authorization', `Bearer ${otherToken}`)
      .send({ commentId: comment.comment_id, reason: 'Không được đọc bình luận chờ qua báo cáo.' });
    expect(commentReport.status).toBe(404);
  });
  it('never republishes a hidden post through an author edit', async () => {
    const { body } = await postBlog();
    const id = body.data.blog.post_id;
    await prisma.post.update({ where: { post_id: id }, data: { status: 'HIDDEN' } });
    const edited = await putBlog(id, { content: 'Tác giả sửa nội dung đang bị ẩn.' });
    expect(edited.status).toBe(200);
    expect(edited.body.data.blog.status).toBe('HIDDEN');
    expect(await prisma.contentModerationJob.count({ where: { postId: id } })).toBe(1);
  });
  it('queues administrator text edits so an old scan cannot apply to new text', async () => {
    const { body } = await postBlog();
    const id = body.data.blog.post_id;
    const edited = await request(app).put(`/api/v1/admin/posts/${id}`).set('Authorization', `Bearer ${adminToken}`)
      .send({ content: 'Nội dung do quản trị viên sửa lại.' });
    expect(edited.status).toBe(200);
    expect(await prisma.contentModerationJob.count({ where: { postId: id } })).toBe(2);
    expect((await prisma.post.findUnique({ where: { post_id: id } })).moderationVersion).toBe(2);
  });
  it('removes resolved comments from the active AI queue', async () => {
    const comment = await prisma.comment.create({ data: { post_id: parent.post_id, user_id: owner.user_id,
      content: 'Nội dung cần quản trị viên xem xét.', status: 'HIDDEN_BY_AI', is_flagged_by_ai: true } });
    await resolveAiFlaggedItem({ entityType: 'COMMENT', entityId: comment.comment_id, action: 'REJECT' });
    expect((await getAiFlaggedContent()).comments.some((item) => item.comment_id === comment.comment_id)).toBe(false);
  });
});
