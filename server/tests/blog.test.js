// d:\Projects\FPT\SWP391\server\tests\blog.test.js
// Kiểm thử API blog: xác thực, validate, CRUD, quyền sở hữu, xóa mềm và an toàn tệp đính kèm (cần DB test có seed).
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { postRepository } from '../src/repositories/post.repository.js';

// Nhóm test: API blog và quy trình tạo bài viết.
describe('Blog API & Post Creation Workflow', () => {
  const authorToken = generateToken({ user_id: 1, role: 2 });
  const otherUserToken = generateToken({ user_id: 2, role: 2 });
  const adminToken = generateToken({ user_id: 1, role: 1 });

  // Tạo blog khi chưa đăng nhập phải bị 401.
  it('rejects unauthenticated blog creation with 401', async () => {
    const res = await request(app)
      .post('/api/blogs')
      .send({ title: 'Bài viết chưa đăng nhập', content: 'Nội dung' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // Thiếu tiêu đề hoặc nội dung phải bị 400.
  it('validates blog payload: rejects missing title or content with 400', async () => {
    const res = await request(app)
      .post('/api/blogs')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ title: '', content: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Chuyên mục không tồn tại bị 400 kèm thông báo tiếng Việt rõ ràng.
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

  // Luồng CRUD đầy đủ: tác giả tạo/sửa/xóa, người khác bị 403, admin được sửa, bài xóa mềm vẫn còn trong DB.
  it('creates, retrieves, updates, and deletes a blog post successfully', async () => {
    // 1. Tạo bài blog kèm chuyên mục và tệp đính kèm
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

    // 2. Lấy danh sách blog và xác nhận bài vừa tạo có mặt
    const allRes = await request(app).get('/api/blogs');
    expect(allRes.status).toBe(200);
    expect(allRes.body.success).toBe(true);
    const foundInAll = allRes.body.data.blogs.find((b) => b.post_id === createdPostId);
    expect(foundInAll).toBeDefined();
    expect(foundInAll.title).toBe('Mẹo ăn chay thực tế cho người mới bắt đầu');

    // 3. Lấy blog theo ID
    const getRes = await request(app).get(`/api/blogs/${createdPostId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.blog.post_id).toBe(createdPostId);

    // 4. Kiểm tra bảo vệ quyền sở hữu: người dùng khác phải nhận 403
    const forbiddenRes = await request(app)
      .put(`/api/blogs/${createdPostId}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ title: 'Hack sửa bài của người khác' });
    expect(forbiddenRes.status).toBe(403);

    // 5. Tác giả cập nhật blog thành công
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

    // 6. Admin cũng được cập nhật bài blog
    const adminUpdateRes = await request(app)
      .put(`/api/blogs/${createdPostId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Mẹo ăn chay thực tế (Admin đã duyệt và chỉnh sửa)',
      });
    expect(adminUpdateRes.status).toBe(200);

    // 7. Tác giả xóa mềm bài blog
    const deleteRes = await request(app)
      .delete(`/api/blogs/${createdPostId}`)
      .set('Authorization', `Bearer ${authorToken}`);
    expect(deleteRes.status).toBe(200);

    // 8. Xác nhận blog không còn trong danh sách đang hoạt động
    const afterDeleteRes = await request(app).get('/api/blogs');
    const stillPresent = afterDeleteRes.body.data.blogs.find((b) => b.post_id === createdPostId);
    expect(stillPresent).toBeUndefined();

    // 9. Kiểm tra trong DB: bài bị xóa mềm theo chính sách lưu giữ 30 ngày
    const postRecord = await prisma.post.findUnique({
      where: { post_id: createdPostId },
    });
    expect(postRecord).not.toBeNull();
    expect(postRecord.status).toBe('DELETED');
    expect(postRecord.deleted_at).not.toBeNull();

    // Dọn dẹp dữ liệu bài viết sau test
    await postRepository.hardDeletePost(createdPostId);
  });

  // URL đính kèm có path traversal phải bị từ chối.
  it('rejects blog creation with path traversal in attachment URL', async () => {
    const res = await request(app)
      .post('/api/blogs')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: 'Thử nghiệm Path Traversal',
        content: 'Nội dung kiểm tra an ninh tệp đính kèm',
        attachments: [
          { url: '/uploads/../../etc/passwd', type: 'image' },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Loại media viết hoa (IMAGE/VIDEO) được chấp nhận và chuẩn hóa về chữ thường khi tạo và sửa.
  it('accepts uppercase media types (IMAGE/VIDEO) and normalizes to lowercase', async () => {
    const res = await request(app)
      .post('/api/blogs')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: 'Thử nghiệm phân loại tệp viết hoa',
        content: 'Kiểm tra trường type nhận IMAGE và VIDEO và chuẩn hóa về chữ thường.',
        categoryId: 1,
        attachments: [
          { url: '/uploads/posts/salad.jpg', type: 'IMAGE', name: 'salad.jpg' },
          { url: '/uploads/posts/cooking.mp4', type: 'VIDEO', name: 'cooking.mp4' },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.blog.attachments).toHaveLength(2);
    expect(res.body.data.blog.attachments[0].type).toBe('image');
    expect(res.body.data.blog.attachments[1].type).toBe('video');

    const createdPostId = res.body.data.blog.post_id;
    const updateRes = await request(app)
      .put(`/api/blogs/${createdPostId}`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        attachments: [
          { url: '/uploads/posts/salad.jpg', type: 'IMAGE', name: 'salad.jpg' },
        ],
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.blog.attachments[0].type).toBe('image');

    await postRepository.hardDeletePost(createdPostId);
  });

  // Loại media không hỗ trợ (audio) bị 400.
  it('rejects unsupported media type with 400', async () => {
    const res = await request(app)
      .post('/api/blogs')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: 'Thử nghiệm loại tệp không hợp lệ',
        content: 'Nội dung kiểm tra loại tệp ngoài image/video',
        attachments: [
          { url: '/uploads/posts/salad.jpg', type: 'audio' },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
