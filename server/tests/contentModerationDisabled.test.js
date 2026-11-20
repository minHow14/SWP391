// D:/SWP391/SWP391/server/tests/contentModerationDisabled.test.js
// Kiểm thử tích hợp (cần DB test): hệ thống vẫn tương thích khi tắt kiểm duyệt nội dung bằng AI.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
// Ép tắt kiểm duyệt trước khi import app (vi.hoisted chạy trước mọi import) để app đọc đúng cấu hình.
vi.hoisted(() => { process.env.CONTENT_MODERATION_ENABLED = 'false'; });
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { contentModerationRepository as jobs } from '../src/repositories/contentModerationRepository.js';
import { processContentModerationJob } from '../src/services/contentModerationProcessor.js';

// Người dùng chủ bài viết, token đăng nhập, cấu hình lease và kết quả kiểm duyệt giả dùng chung.
let owner, token;
const config = { leaseMs: 60_000, retryMs: 1, maxAttempts: 3 };
const result = { decision: 'ALLOW', reason: 'Nội dung hợp lệ.', categories: [], evidence: [], modelName: 'provider-model', policyVersion: '1' };
// Tạo user test và JWT trước khi chạy nhóm test.
beforeAll(async () => {
  owner = await prisma.user.create({ data: { email: `moderation-disabled-${randomUUID()}@example.invalid`,
    full_name: 'Moderation disabled author', password_hash: 'unused-test-hash' } });
  token = generateToken({ user_id: owner.user_id });
});
// Xóa user test và đóng kết nối DB sau khi chạy xong.
afterAll(async () => {
  await prisma.user.deleteMany({ where: { user_id: owner?.user_id ?? -1 } });
  await prisma.$disconnect();
});

// Nhóm test: hành vi khi kiểm duyệt bị tắt.
describe('moderation disabled compatibility', () => {
  // Bài viết mới phải được đăng ngay (PUBLISHED) và không tạo job kiểm duyệt nào.
  it('keeps ordinary creation published without scheduling jobs', async () => {
    const res = await request(app).post('/api/v1/blogs').set('Authorization', `Bearer ${token}`)
      .send({ title: 'Món chay', content: 'Cách chế biến từ thực vật.' });
    expect(res.status).toBe(201);
    expect(res.body.data.blog.status).toBe('PUBLISHED');
    expect(res.body.data).not.toHaveProperty('jobId');
    expect(await prisma.contentModerationJob.count({ where: { userId: owner.user_id } })).toBe(0);
  });
  // Nếu nội dung bị sửa sau khi tắt kiểm duyệt, kết quả quét cũ đang chạy dở không được áp dụng (phiên bản nội dung đã tăng),
  // tránh duyệt nhầm nội dung mới chưa được AI kiểm tra.
  it('invalidates an in-flight old scan when text changes after disabling moderation', async () => {
    const post = await prisma.post.create({ data: { author_id: owner.user_id, post_type: 'BLOG',
      status: 'PENDING_MODERATION', moderationVersion: 1, blog: { create: { title: 'Món chay', content: 'Nội dung cũ.' } } } });
    await jobs.create({ userId: owner.user_id, postId: post.post_id, contentVersion: 1, title: 'Món chay', content: 'Nội dung cũ.' });
    const job = await jobs.claim(config);
    const edit = await request(app).put(`/api/v1/blogs/${post.post_id}`).set('Authorization', `Bearer ${token}`)
      .send({ content: 'Nội dung mới chưa được AI kiểm tra.' });
    expect(edit.status).toBe(200);
    expect(edit.body.data.blog.moderationVersion).toBe(2);
    expect(await processContentModerationJob(job, { config, ai: { moderate: async () => result } })).toMatchObject({ applied: false });
    expect((await prisma.post.findUnique({ where: { post_id: post.post_id } })).status).toBe('PENDING_MODERATION');
  });
});
