// d:\Projects\FPT\SWP391\server\tests\blog.test.js
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { postRepository } from '../src/repositories/post.repository.js';

describe('Blog API & Post Creation Workflow', () => {
  const authorToken = generateToken({ user_id: 1, role: 2 });
  const otherUserToken = generateToken({ user_id: 2, role: 2 });
  const adminToken = generateToken({ user_id: 1, role: 1 });

  it('rejects unauthenticated blog creation with 401', async () => {
    const res = await request(app)
      .post('/api/blogs')
      .send({ title: 'Bài viết chưa đăng nhập', content: 'Nội dung' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('validates blog payload: rejects missing title or content with 400', async () => {
    const res = await request(app)
      .post('/api/blogs')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ title: '', content: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects non-existent categoryId with 400', async () => {
    const res = await request(app)
      .post('/api/blogs')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: 'Tiêu đề hợp lệ',
        content: 'Nội dung hợp lệ',
        categoryId: 999999,
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Chuyên mục bài viết không tồn tại');
  });

  it('creates, retrieves, updates, and deletes a blog post successfully', async () => {
    // 1. Create a blog post with category and attachments
    const res = await request(app)
      .post('/api/blogs')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: 'Mẹo ăn chay thực tế cho người mới bắt đầu',
        content: 'Chia sẻ các nguyên tắc xây dựng chế độ dinh dưỡng thuần thực vật lành mạnh và bền vững...',
        categoryId: 1,
        attachments: [
          { url: '/uploads/posts/salad.jpg', type: 'image', name: 'salad.jpg' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.blog).toBeDefined();
    expect(res.body.data.blog.title).toBe('Mẹo ăn chay thực tế cho người mới bắt đầu');
    expect(res.body.data.blog.post_id).toBeDefined();
    expect(res.body.data.blog.attachments).toHaveLength(1);
    expect(res.body.data.blog.attachments[0].url).toBe('/uploads/posts/salad.jpg');

    const createdPostId = res.body.data.blog.post_id;

    // 2. Fetch all blogs and verify the newly created blog is included
    const allRes = await request(app).get('/api/blogs');
    expect(allRes.status).toBe(200);
    expect(allRes.body.success).toBe(true);
    const foundInAll = allRes.body.data.blogs.find((b) => b.post_id === createdPostId);
    expect(foundInAll).toBeDefined();
    expect(foundInAll.title).toBe('Mẹo ăn chay thực tế cho người mới bắt đầu');

    // 3. Fetch blog by ID
    const getRes = await request(app).get(`/api/blogs/${createdPostId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.blog.post_id).toBe(createdPostId);

    // 4. Test ownership protection: another user should receive 403
    const forbiddenRes = await request(app)
      .put(`/api/blogs/${createdPostId}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ title: 'Hack sửa bài của người khác' });
    expect(forbiddenRes.status).toBe(403);

    // 5. Author updates blog successfully
    const updateRes = await request(app)
      .put(`/api/blogs/${createdPostId}`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: 'Mẹo ăn chay thực tế (Đã chỉnh sửa)',
        content: 'Nội dung cập nhật mới nhất cho cộng đồng.',
        categoryId: 2,
        attachments: [
          { url: '/uploads/posts/cooking.mp4', type: 'video', name: 'cooking.mp4' },
        ],
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.blog.title).toBe('Mẹo ăn chay thực tế (Đã chỉnh sửa)');
    expect(updateRes.body.data.blog.category_id).toBe(2);
    expect(updateRes.body.data.blog.attachments).toHaveLength(1);
    expect(updateRes.body.data.blog.attachments[0].type).toBe('video');

    // 6. Admin can also update blog post
    const adminUpdateRes = await request(app)
      .put(`/api/blogs/${createdPostId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Mẹo ăn chay thực tế (Admin đã duyệt và chỉnh sửa)',
      });
    expect(adminUpdateRes.status).toBe(200);

    // 7. Soft delete blog post by author
    const deleteRes = await request(app)
      .delete(`/api/blogs/${createdPostId}`)
      .set('Authorization', `Bearer ${authorToken}`);
    expect(deleteRes.status).toBe(200);

    // 8. Verify blog is omitted from active blogs list
    const afterDeleteRes = await request(app).get('/api/blogs');
    const stillPresent = afterDeleteRes.body.data.blogs.find((b) => b.post_id === createdPostId);
    expect(stillPresent).toBeUndefined();

    // 9. Verify in database: soft-deleted according to 30-day retention policy
    const postRecord = await prisma.post.findUnique({
      where: { post_id: createdPostId },
    });
    expect(postRecord).not.toBeNull();
    expect(postRecord.status).toBe('DELETED');
    expect(postRecord.deleted_at).not.toBeNull();

    // Dọn dẹp dữ liệu bài viết sau test
    await postRepository.hardDeletePost(createdPostId);
  });
});
