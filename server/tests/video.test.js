// d:\Projects\FPT\SWP391\server\tests\video.test.js
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';

describe('Video API & Video Creation Workflow', () => {
  const authorToken = generateToken({ user_id: 1, role: 2 });
  const otherUserToken = generateToken({ user_id: 2, role: 2 });
  const adminToken = generateToken({ user_id: 1, role: 1 });

  it('rejects unauthenticated video creation with 401', async () => {
    const res = await request(app)
      .post('/api/videos')
      .send({ title: 'Video chưa đăng nhập', video_url: 'https://youtube.com/watch?v=123' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('validates video payload: rejects missing title or video_url with 400', async () => {
    const res = await request(app)
      .post('/api/videos')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ title: '', video_url: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('creates, retrieves, updates, and deletes a video post successfully', async () => {
    // 1. Create a video post with category
    const createRes = await request(app)
      .post('/api/videos')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: 'Hướng dẫn làm súp bí đỏ hạt sen thực dưỡng',
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        transcript: 'Bí đỏ gọt vỏ, hấp chín, xay mịn cùng nước dùng nấm và hạt sen tươi...',
        categoryId: 1,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.video).toBeDefined();
    expect(createRes.body.data.video.title).toBe('Hướng dẫn làm súp bí đỏ hạt sen thực dưỡng');
    expect(createRes.body.data.video.video_url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(createRes.body.data.video.category_id).toBe(1);

    const createdPostId = createRes.body.data.video.post_id;

    // 2. Fetch all videos and verify newly created video is present
    const allRes = await request(app).get('/api/videos');
    expect(allRes.status).toBe(200);
    expect(allRes.body.success).toBe(true);
    const found = allRes.body.data.videos.find((v) => v.post_id === createdPostId);
    expect(found).toBeDefined();
    expect(found.title).toBe('Hướng dẫn làm súp bí đỏ hạt sen thực dưỡng');

    // 3. Fetch video by ID
    const getRes = await request(app).get(`/api/videos/${createdPostId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.video.post_id).toBe(createdPostId);

    // 4. Test ownership protection: another user should receive 403
    const forbiddenRes = await request(app)
      .put(`/api/videos/${createdPostId}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ title: 'Người khác sửa video' });
    expect(forbiddenRes.status).toBe(403);

    // 5. Author updates video successfully
    const updateRes = await request(app)
      .put(`/api/videos/${createdPostId}`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: 'Hướng dẫn làm súp bí đỏ hạt sen (Đã chỉnh sửa)',
        categoryId: 2,
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.video.title).toBe('Hướng dẫn làm súp bí đỏ hạt sen (Đã chỉnh sửa)');
    expect(updateRes.body.data.video.category_id).toBe(2);

    // 6. Delete video post
    const deleteRes = await request(app)
      .delete(`/api/videos/${createdPostId}`)
      .set('Authorization', `Bearer ${authorToken}`);
    expect(deleteRes.status).toBe(200);

    // 7. Verify video is soft-deleted from active list
    const afterDeleteRes = await request(app).get('/api/videos');
    const stillPresent = afterDeleteRes.body.data.videos.find((v) => v.post_id === createdPostId);
    expect(stillPresent).toBeUndefined();

    // Clean up post record from database
    await prisma.video.deleteMany({ where: { post_id: createdPostId } });
    await prisma.postCategory.deleteMany({ where: { post_id: createdPostId } });
    await prisma.post.deleteMany({ where: { post_id: createdPostId } });
  });
});
