// D:/SWP391/SWP391/server/tests/contentModerationDatabase.test.js
// Kiểm thử tích hợp (cần DB test) repository job kiểm duyệt nội dung: phân quyền đọc, chống trùng, lease và retry.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import prisma from '../src/config/prisma.js';
import { contentModerationRepository as jobs } from '../src/repositories/contentModerationRepository.js';

// Hai user (chủ bài và người khác), bài viết test, cấu hình lease và hàm tạo dữ liệu job có thể ghi đè.
let owner, other, post;
const config = { leaseMs: 60_000, maxAttempts: 3, retryMs: 1 };
const source = (patch = {}) => ({ userId: owner.user_id, postId: post.post_id,
  contentVersion: 1, title: 'Sườn chay', content: 'Sườn chay làm từ nấm và đậu nành.', ...patch });
// Tạo hai user và một bài viết đang chờ kiểm duyệt trước khi chạy nhóm test.
beforeAll(async () => {
  const user = (name) => ({ email: `moderation-${randomUUID()}@example.invalid`, full_name: name, password_hash: 'unused-test-hash' });
  owner = await prisma.user.create({ data: user('Moderation owner') });
  other = await prisma.user.create({ data: user('Moderation other') });
  post = await prisma.post.create({ data: { author_id: owner.user_id, post_type: 'BLOG', status: 'PENDING_MODERATION', moderationVersion: 1 } });
});
// Xóa job của chủ bài trước mỗi test để các test độc lập.
beforeEach(async () => { await prisma.contentModerationJob.deleteMany({ where: { userId: owner.user_id } }); });
// Dọn user test và đóng kết nối DB.
afterAll(async () => {
  await prisma.user.deleteMany({ where: { user_id: { in: [owner?.user_id, other?.user_id].filter(Boolean) } } });
  await prisma.$disconnect();
});

// Nhóm test: lưu trữ và điều phối job kiểm duyệt.
describe('content moderation persistence', () => {
  // Chỉ chủ job (hoặc admin) đọc được job, và dữ liệu trả về không chứa nội dung gốc hay thông tin lease nội bộ.
  it('scopes job reads and excludes the content snapshot and lease', async () => {
    const created = await jobs.create(source());
    expect(await jobs.findOwned({ id: created.id, userId: other.user_id })).toBeNull();
    const visible = await jobs.findOwned({ id: created.id, userId: owner.user_id });
    expect(visible).toMatchObject({ id: created.id, status: 'PENDING' });
    for (const field of ['content', 'title', 'userId', 'leaseToken', 'leaseExpiresAt']) expect(visible).not.toHaveProperty(field);
    expect(await jobs.findOwned({ id: created.id, userId: other.user_id, isAdmin: true })).toBeTruthy();
  });
  // Ràng buộc unique phải chặn tạo hai job cho cùng một phiên bản nội dung.
  it('prevents duplicate jobs for one content version', async () => {
    await jobs.create(source());
    await expect(jobs.create(source())).rejects.toHaveProperty('code', 'P2002');
  });
  // Nhiều worker tranh nhau nhận job thì chỉ một worker nhận được (khóa hàng trong DB).
  it('claims one job once under competing workers', async () => {
    const created = await jobs.create(source());
    const claims = await Promise.all(Array.from({ length: 4 }, () => jobs.claim(config)));
    expect(claims.filter((job) => job?.id === created.id)).toHaveLength(1);
    expect(claims.find((job) => job?.id === created.id)).toMatchObject({ status: 'PROCESSING', attempt: 1 });
  });
  // Worker cũ có lease hết hạn bị chặn ghi kết quả (fencing); khi thu hồi job, nội dung snapshot vẫn được giữ để xử lý lại.
  it('fences old workers after expiry and preserves the snapshot on recovery', async () => {
    await jobs.create(source());
    const job = await jobs.claim(config);
    await prisma.contentModerationJob.update({ where: { id: job.id }, data: { leaseExpiresAt: new Date(0) } });
    await expect(jobs.updateLeased({ job, data: { status: 'COMPLETED' } })).rejects.toHaveProperty('errorCode', 'MODERATION_LEASE_LOST');
    await jobs.recoverExpired(config);
    const record = await prisma.contentModerationJob.findUnique({ where: { id: job.id } });
    expect(record).toMatchObject({ status: 'PENDING', content: source().content, leaseToken: null });
  });
  // Job đã hết số lần thử phải chuyển FAILED thay vì retry mãi mãi.
  it('fails exhausted jobs instead of retrying forever', async () => {
    const created = await jobs.create(source({ attempt: config.maxAttempts }));
    await jobs.recoverExpired(config);
    expect(await jobs.findOwned({ id: created.id, userId: owner.user_id })).toMatchObject({ status: 'FAILED', errorCode: 'MODERATION_RETRIES_EXHAUSTED' });
    expect(await jobs.claim(config)).toBeNull();
  });
  // Nếu tạo job thất bại thì thay đổi nội dung trong cùng transaction phải được rollback.
  it('rolls back content changes if job persistence fails', async () => {
    const count = await prisma.post.count({ where: { author_id: owner.user_id } });
    await expect(jobs.transaction(async (tx) => {
      await tx.post.create({ data: { author_id: owner.user_id, post_type: 'BLOG' } });
      await jobs.create(source({ userId: -1 }), tx);
    })).rejects.toBeTruthy();
    expect(await prisma.post.count({ where: { author_id: owner.user_id } })).toBe(count);
  });
});
