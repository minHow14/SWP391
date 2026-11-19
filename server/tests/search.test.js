// d:\Projects\FPT\SWP391\server\tests\search.test.js
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { generateToken } from '../src/utils/jwt.js';

describe('Search API for Video and Blogs', () => {
  const authorToken = generateToken({ user_id: 1, role: 2 });

  it('rejects search request without query parameter q with 400', async () => {
    const res = await request(app).get('/api/v1/search');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('allows guest (unauthenticated) users to search', async () => {
    const res = await request(app).get('/api/v1/search').query({ q: 'chay' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.results).toBeDefined();
    expect(Array.isArray(res.body.data.results.blogs)).toBe(true);
    expect(Array.isArray(res.body.data.results.videos)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBe(1);
  });

  it('filters results by type=BLOG', async () => {
    const res = await request(app).get('/api/v1/search').query({ q: 'chay', type: 'BLOG' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('BLOG');
    expect(Array.isArray(res.body.data.results.blogs)).toBe(true);
    expect(res.body.data.results.videos).toHaveLength(0);
  });

  it('filters results by type=VIDEO', async () => {
    const res = await request(app).get('/api/v1/search').query({ q: 'chay', type: 'VIDEO' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('VIDEO');
    expect(res.body.data.results.blogs).toHaveLength(0);
    expect(Array.isArray(res.body.data.results.videos)).toBe(true);
  });

  it('finds created blog and video via search endpoint', async () => {
    const uniqueKeyword = `SearchTag_${Date.now()}`;

    // Create a blog with the unique keyword
    const blogRes = await request(app)
      .post('/api/v1/blogs')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: `Món chay ngon ${uniqueKeyword}`,
        content: `Cách nấu canh chua thanh đạm chứa từ khóa ${uniqueKeyword}`,
        categoryId: 1,
      });
    expect(blogRes.status).toBe(201);
    const blogPostId = blogRes.body.data.blog.post_id;

    // Create a video with the unique keyword
    const videoRes = await request(app)
      .post('/api/v1/videos')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: `Video hướng dẫn nấu ăn ${uniqueKeyword}`,
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        transcript: `Lời thoại video hướng dẫn cho ${uniqueKeyword}`,
        categoryId: 1,
      });
    expect(videoRes.status).toBe(201);
    const videoPostId = videoRes.body.data.video.post_id;

    // Search globally with the unique keyword
    const searchRes = await request(app)
      .get('/api/v1/search')
      .query({ q: uniqueKeyword });

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.success).toBe(true);

    const foundBlog = searchRes.body.data.results.blogs.find((b) => b.post_id === blogPostId);
    expect(foundBlog).toBeDefined();
    expect(foundBlog.title).toContain(uniqueKeyword);

    const foundVideo = searchRes.body.data.results.videos.find((v) => v.post_id === videoPostId);
    expect(foundVideo).toBeDefined();
    expect(foundVideo.title).toContain(uniqueKeyword);

    // Clean up
    await request(app).delete(`/api/v1/blogs/${blogPostId}`).set('Authorization', `Bearer ${authorToken}`);
    await request(app).delete(`/api/v1/videos/${videoPostId}`).set('Authorization', `Bearer ${authorToken}`);
  });
});
