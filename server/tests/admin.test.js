// server/tests/admin.test.js
// Kiểm thử API quản trị và ranh giới phân quyền (RBAC): dashboard, thành viên, chuyên mục, kiểm duyệt AI,
// lưu giữ dữ liệu và xóa bài (cần DB test có seed admin user_id 1 và thành viên user_id 2).
import request from 'supertest';
import { describe, expect, it, afterAll } from 'vitest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { postRepository } from '../src/repositories/post.repository.js';

// Nhóm test: API admin và ranh giới RBAC.
describe('Admin API & RBAC Boundary', () => {
  const adminToken = generateToken({ user_id: 1, role: 1 });
  const normalUserToken = generateToken({ user_id: 2, role: 2 });

  // Chưa đăng nhập vào dashboard admin phải bị 401.
  it('rejects unauthenticated requests to admin dashboard', async () => {
    const res = await request(app).get('/api/admin/dashboard/stats');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // Thành viên thường (role 2) truy cập route admin phải bị 403.
  it('rejects non-admin users (Role 2) from accessing admin routes with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/stats')
      .set('Authorization', `Bearer ${normalUserToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // Admin (role 1) xem được thống kê dashboard gồm thành viên, nội dung và AI.
  it('allows Admin (Role 1) to retrieve full dashboard statistics (FE-10)', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.members).toBeDefined();
    expect(res.body.data.content).toBeDefined();
    expect(res.body.data.ai).toBeDefined();
  });

  // Admin lấy danh sách thành viên có phân trang.
  it('allows Admin to retrieve users list and paginate (FE-01)', async () => {
    const res = await request(app)
      .get('/api/admin/users?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.page).toBe(1);
  });

  // Admin lấy danh sách chuyên mục.
  it('allows Admin to fetch categories (FE-04)', async () => {
    const res = await request(app)
      .get('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // Admin lấy danh sách nội dung bị AI gắn cờ (bài viết và bình luận).
  it('allows Admin to retrieve AI flagged content for moderation (FE-05)', async () => {
    const res = await request(app)
      .get('/api/admin/moderation/flagged')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.posts).toBeDefined();
    expect(res.body.data.comments).toBeDefined();
  });

  // Admin theo dõi trạng thái các mô hình AI.
  it('allows Admin to monitor AI models status (FE-06)', async () => {
    const res = await request(app)
      .get('/api/admin/ai/models')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // Admin xem thống kê lưu giữ 30 ngày và dữ liệu chờ dọn vĩnh viễn.
  it('allows Admin to fetch 30-day retention and purge statistics (FE-10 / Maintenance)', async () => {
    const res = await request(app)
      .get('/api/admin/maintenance/retention-stats?retentionDays=30')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.retentionDays).toBe(30);
    expect(res.body.data.users).toBeDefined();
    expect(res.body.data.posts).toBeDefined();
    expect(res.body.data.comments).toBeDefined();
  });

  // Xóa bài: mặc định ẩn (xóa mềm, giữ bản ghi); ?permanent=true xóa cứng hoàn toàn khỏi DB.
  it('supports post deletion: soft-delete (hide) and permanent hard-delete (removes completely from database)', async () => {
    // 1. Tạo post test
    const post = await prisma.post.create({
      data: {
        author_id: 1,
        post_type: 'BLOG',
        status: 'PUBLISHED',
        blog: {
          create: {
            title: 'Test Post For Deletion',
            content: 'Nội dung bài viết thử nghiệm ẩn và xóa vĩnh viễn',
          },
        },
      },
    });

    // 2. Thử ẩn bài viết (xóa mềm)
    const softRes = await request(app)
      .delete(`/api/admin/posts/${post.post_id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(softRes.status).toBe(200);
    expect(softRes.body.success).toBe(true);

    const postAfterSoft = await prisma.post.findUnique({ where: { post_id: post.post_id } });
    expect(postAfterSoft).not.toBeNull();
    expect(postAfterSoft.status).toBe('HIDDEN');
    expect(postAfterSoft.deleted_at).not.toBeNull();

    // 3. Thử xóa vĩnh viễn với ?permanent=true (xóa cứng hoàn toàn khỏi DB)
    const hardRes = await request(app)
      .delete(`/api/admin/posts/${post.post_id}?permanent=true`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(hardRes.status).toBe(200);
    expect(hardRes.body.success).toBe(true);

    const postAfterHard = await prisma.post.findUnique({ where: { post_id: post.post_id } });
    expect(postAfterHard).toBeNull();
  });

  // Admin từ chối nội dung bị gắn cờ thì bài chuyển DELETED nhưng bản ghi vẫn giữ lại để kiểm tra (audit).
  it('AI Moderation flags content as deleted while preserving record in DB for audit trail', async () => {
    // Tạo 1 post test bị AI gắn cờ
    const flaggedPost = await prisma.post.create({
      data: {
        author_id: 1,
        post_type: 'BLOG',
        status: 'HIDDEN_BY_AI',
        blog: {
          create: {
            title: 'Flagged Spam Post',
            content: 'Spam vi phạm quy định',
          },
        },
      },
    });

    // Gọi gỡ bỏ (REJECT) qua AI Moderation
    const resolveRes = await request(app)
      .post('/api/admin/moderation/resolve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        entityType: 'POST',
        entityId: flaggedPost.post_id,
        action: 'REJECT',
        notes: 'Xác nhận vi phạm, gỡ bỏ vĩnh viễn',
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.success).toBe(true);

    // Xác nhận bản ghi vẫn còn trong DB để phục vụ audit/lưu trữ nhưng ở trạng thái DELETED
    const checkDb = await prisma.post.findUnique({ where: { post_id: flaggedPost.post_id } });
    expect(checkDb).not.toBeNull();
    expect(checkDb.status).toBe('DELETED');
  });

  // Kiểm duyệt chấp nhận action DELETE và action "approve" viết thường (khôi phục về PUBLISHED).
  it('AI Moderation accepts DELETE action and restores with lowercase approve', async () => {
    // 1. Tạo post test bị gắn cờ để test action: 'DELETE'
    const postToDelete = await prisma.post.create({
      data: {
        author_id: 1,
        post_type: 'BLOG',
        status: 'HIDDEN_BY_AI',
        blog: {
          create: {
            title: 'Flagged Spam Post',
            content: 'Nội dung spam thử nghiệm DELETE',
          },
        },
      },
    });

    const deleteRes = await request(app)
      .post('/api/admin/moderation/resolve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        entityType: 'POST',
        entityId: postToDelete.post_id,
        action: 'DELETE',
        notes: 'Gỡ bỏ với action DELETE',
      });

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    const postDeleted = await prisma.post.findUnique({ where: { post_id: postToDelete.post_id } });
    expect(postDeleted.status).toBe('DELETED');

    // 2. Tạo post test bị gắn cờ để test action: 'approve' (lowercase)
    const postToApprove = await prisma.post.create({
      data: {
        author_id: 1,
        post_type: 'BLOG',
        status: 'HIDDEN_BY_AI',
        blog: {
          create: {
            title: 'Flagged Spam Post',
            content: 'Nội dung hợp lệ sau kiểm tra',
          },
        },
      },
    });

    const approveRes = await request(app)
      .post('/api/admin/moderation/resolve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        entityType: 'POST',
        entityId: postToApprove.post_id,
        action: 'approve',
        notes: 'Phê duyệt lại với action approve chữ thường',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    const postApproved = await prisma.post.findUnique({ where: { post_id: postToApprove.post_id } });
    expect(postApproved.status).toBe('PUBLISHED');
  });

  // Dọn các bài viết test theo tiêu đề đã dùng.
  afterAll(async () => {
    // Dọn dẹp dữ liệu bài viết sinh ra trong test
    const testPosts = await prisma.post.findMany({
      where: {
        blog: {
          title: { in: ['Flagged Spam Post', 'Vi phạm nghiêm trọng bài viết', 'Test Post For Deletion'] },
        },
      },
      select: { post_id: true },
    });
    for (const p of testPosts) {
      await postRepository.hardDeletePost(p.post_id);
    }
  });
});
