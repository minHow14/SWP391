// server/tests/report.test.js
import request from 'supertest';
import { describe, expect, it, afterAll } from 'vitest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { postRepository } from '../src/repositories/post.repository.js';

describe('Report System Integration (Post & Comment)', () => {
  const user1Token = generateToken({ user_id: 1, role: 1 });
  const user2Token = generateToken({ user_id: 2, role: 2 });

  it('rejects unauthenticated report submissions with 401', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({ post_id: 1, reason: 'Nội dung spam hoặc vi phạm' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('validates report payload: rejects missing both post and comment target', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ reason: 'Lý do báo cáo nhưng thiếu target' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('validates report payload: rejects reason with fewer than 5 characters', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ post_id: 1, reason: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects user reporting their own post', async () => {
    const ownPost = await prisma.post.create({
      data: {
        author_id: 2,
        post_type: 'BLOG',
        status: 'PUBLISHED',
        blog: {
          create: {
            title: 'User 2 Own Post',
            content: 'Nội dung bài viết của chính user 2',
          },
        },
      },
    });

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ post_id: ownPost.post_id, reason: 'Tự báo cáo bài của mình' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('không thể tự báo cáo');
  });

  it('allows user to report another user post, and rejects duplicate pending reports', async () => {
    const postOfUser1 = await prisma.post.create({
      data: {
        author_id: 1,
        post_type: 'BLOG',
        status: 'PUBLISHED',
        blog: {
          create: {
            title: 'User 1 Post For Testing Report',
            content: 'Nội dung bài viết được báo cáo bởi user 2',
          },
        },
      },
    });

    // 1. User 2 gửi báo cáo lần 1 -> Thành công (201)
    const reportRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ post_id: postOfUser1.post_id, reason: 'Bài viết có dấu hiệu quảng cáo sai sự thật' });

    expect(reportRes.status).toBe(201);
    expect(reportRes.body.success).toBe(true);
    expect(reportRes.body.data.report_id).toBeDefined();
    expect(reportRes.body.data.status).toBe('PENDING');

    // 2. User 2 cố gắng gửi lại báo cáo cho cùng post khi báo cáo cũ đang PENDING -> 409 Conflict
    const dupRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ post_id: postOfUser1.post_id, reason: 'Spam báo cáo lần hai cùng nội dung' });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
  });

  it('when admin resolves a COMMENT report by hiding content: ONLY the comment is hidden, the post remains PUBLISHED', async () => {
    // Tạo 1 post của user 1 và 1 comment của user 1
    const post = await prisma.post.create({
      data: {
        author_id: 1,
        post_type: 'BLOG',
        status: 'PUBLISHED',
        blog: { create: { title: 'Post with comment for report test', content: 'Nội dung bài viết vẫn an toàn' } },
      },
    });

    const commentOfUser1 = await prisma.comment.create({
      data: {
        post_id: post.post_id,
        user_id: 1,
        content: 'Bình luận vi phạm tiêu chuẩn cộng đồng',
        status: 'ACTIVE',
      },
    });

    // 1. User 2 báo cáo comment này
    const reportRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ comment_id: commentOfUser1.comment_id, post_id: post.post_id, reason: 'Bình luận xúc phạm người dùng khác' });

    expect(reportRes.status).toBe(201);
    const reportId = reportRes.body.data.report_id;

    // 2. Admin resolve report với resolutionAction: 'HIDE_CONTENT'
    const resolveRes = await request(app)
      .patch(`/api/admin/reports/${reportId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ status: 'RESOLVED', resolutionAction: 'HIDE_CONTENT' });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.success).toBe(true);

    // 3. Kiểm tra: BÌNH LUẬN ĐÃ CHUYỂN SANG DELETED
    const commentAfter = await prisma.comment.findUnique({
      where: { comment_id: commentOfUser1.comment_id },
    });
    expect(commentAfter.status).toBe('DELETED');
    expect(commentAfter.deleted_at).not.toBeNull();

    // 4. KIỂM TRA QUAN TRỌNG: BÀI VIẾT VẪN ĐƯỢC GIỮ NGUYÊN (PUBLISHED), KHÔNG BỊ GỠ BỎ!
    const postAfter = await prisma.post.findUnique({
      where: { post_id: post.post_id },
    });
    expect(postAfter.status).toBe('PUBLISHED');
    expect(postAfter.deleted_at).toBeNull();
  });

  it('when admin resolves a POST report by hiding content: the post and its comments are hidden', async () => {
    const postToHide = await prisma.post.create({
      data: {
        author_id: 1,
        post_type: 'BLOG',
        status: 'PUBLISHED',
        blog: { create: { title: 'Vi phạm nghiêm trọng bài viết', content: 'Bài viết độc hại' } },
        comments: {
          create: {
            user_id: 2,
            content: 'Bình luận theo bài viết vi phạm',
            status: 'ACTIVE',
          },
        },
      },
      include: { comments: true },
    });

    // 1. Báo cáo bài viết
    const reportRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ post_id: postToHide.post_id, reason: 'Bài viết chứa thông tin lừa đảo' });

    expect(reportRes.status).toBe(201);
    const reportId = reportRes.body.data.report_id;

    // 2. Admin gỡ nội dung bài viết
    const resolveRes = await request(app)
      .patch(`/api/admin/reports/${reportId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ status: 'RESOLVED', resolutionAction: 'HIDE_CONTENT' });

    expect(resolveRes.status).toBe(200);

    // 3. Bài viết chuyển sang DELETED
    const postAfter = await prisma.post.findUnique({
      where: { post_id: postToHide.post_id },
    });
    expect(postAfter.status).toBe('DELETED');
    expect(postAfter.deleted_at).not.toBeNull();

    // 4. Các bình luận thuộc bài viết đó cũng chuyển sang DELETED
    const commentsAfter = await prisma.comment.findMany({
      where: { post_id: postToHide.post_id },
    });
    expect(commentsAfter.every((c) => c.status === 'DELETED')).toBe(true);
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test để không làm rác cơ sở dữ liệu mẫu
    await prisma.report.deleteMany({
      where: { reason: { in: ['Bài viết có dấu hiệu quảng cáo sai sự thật', 'Bình luận xúc phạm người dùng khác', 'Báo cáo bài viết để admin gỡ bỏ'] } },
    });
    const testPosts = await prisma.post.findMany({
      where: {
        blog: {
          title: { in: ['User 2 Own Post', 'User 1 Post For Testing Report', 'Post with comment for report test', 'Bài viết vi phạm chuẩn bị bị gỡ bỏ'] },
        },
      },
      select: { post_id: true },
    });
    for (const p of testPosts) {
      await postRepository.hardDeletePost(p.post_id);
    }
  });
});
