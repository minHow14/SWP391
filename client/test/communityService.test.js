// client/test/communityService.test.js
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMyPosts,
  savePost,
  uploadPostMedia,
  deletePost,
  addPostComment,
  togglePostVote,
  createReport,
} from '../src/services/communityService.js';
import apiClient from '../src/services/apiClient.js';

const originalRequest = apiClient.request;
const originalGet = apiClient.get;
const originalPost = apiClient.post;
const originalDelete = apiClient.delete;

afterEach(() => {
  apiClient.request = originalRequest;
  apiClient.get = originalGet;
  apiClient.post = originalPost;
  apiClient.delete = originalDelete;
});

test('communityService exports all required functions', () => {
  assert.equal(typeof getMyPosts, 'function');
  assert.equal(typeof savePost, 'function');
  assert.equal(typeof uploadPostMedia, 'function');
  assert.equal(typeof deletePost, 'function');
  assert.equal(typeof addPostComment, 'function');
  assert.equal(typeof togglePostVote, 'function');
  assert.equal(typeof createReport, 'function');
});

test('uploadPostMedia sends FormData to /upload/post-media', async () => {
  let capturedUrl = null;
  let capturedData = null;

  apiClient.post = async (url, data) => {
    capturedUrl = url;
    capturedData = data;
    return {
      success: true,
      data: {
        files: [
          { url: '/uploads/posts/salad.jpg', type: 'image', name: 'salad.jpg' },
        ],
      },
    };
  };

  const files = [{ name: 'salad.jpg' }];
  const uploaded = await uploadPostMedia(files);

  assert.equal(capturedUrl, '/upload/post-media');
  assert.ok(capturedData instanceof FormData);
  assert.equal(uploaded.length, 1);
  assert.equal(uploaded[0].url, '/uploads/posts/salad.jpg');
});

test('savePost sends clean JSON payload to create a new post with attachments', async () => {
  let capturedConfig = null;
  apiClient.request = async (config) => {
    capturedConfig = config;
    return {
      success: true,
      data: {
        blog: {
          post_id: 101,
          title: config.data.title,
          content: config.data.content,
          category_id: config.data.categoryId,
          attachments: config.data.attachments,
        },
      },
    };
  };

  const result = await savePost({
    values: {
      title: 'Chia sẻ thực đơn chay',
      content: 'Bữa sáng đậu hũ, trưa salad ngũ sắc',
      categoryId: '3',
    },
    attachments: [
      { url: '/uploads/posts/salad.jpg', type: 'image', name: 'salad.jpg' },
    ],
  });

  assert.equal(capturedConfig.url, '/blogs');
  assert.equal(capturedConfig.method, 'POST');
  assert.deepEqual(capturedConfig.data, {
    title: 'Chia sẻ thực đơn chay',
    content: 'Bữa sáng đậu hũ, trưa salad ngũ sắc',
    categoryId: 3,
    attachments: [
      { url: '/uploads/posts/salad.jpg', type: 'image', name: 'salad.jpg' },
    ],
  });
  assert.equal(result.post_id, 101);
  assert.equal(result.title, 'Chia sẻ thực đơn chay');
  assert.equal(result.attachments.length, 1);
});

test('savePost sends clean JSON payload to update an existing post', async () => {
  let capturedConfig = null;
  apiClient.request = async (config) => {
    capturedConfig = config;
    return {
      success: true,
      data: {
        blog: {
          post_id: 101,
          title: config.data.title,
          content: config.data.content,
        },
      },
    };
  };

  const result = await savePost({
    postId: 101,
    values: {
      title: 'Tiêu đề mới',
      content: 'Nội dung mới',
    },
  });

  assert.equal(capturedConfig.url, '/blogs/101');
  assert.equal(capturedConfig.method, 'PUT');
  assert.equal(result.post_id, 101);
});

test('deletePost calls DELETE /blogs/:id', async () => {
  let capturedUrl = null;
  apiClient.delete = async (url) => {
    capturedUrl = url;
    return { success: true, message: 'Blog deleted successfully' };
  };

  const res = await deletePost(50);
  assert.equal(capturedUrl, '/blogs/50');
  assert.equal(res.success, true);
});

test('savePost sends clean JSON payload to create a new video post', async () => {
  let capturedConfig = null;
  apiClient.request = async (config) => {
    capturedConfig = config;
    return {
      success: true,
      data: {
        video: {
          post_id: 202,
          title: config.data.title,
          video_url: config.data.video_url,
          thumbnail_url: config.data.thumbnail_url,
          transcript: config.data.transcript,
          category_id: config.data.categoryId,
        },
      },
    };
  };

  const result = await savePost({
    values: {
      title: 'Video nấu phở nấm',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      transcript: 'Chi tiết cách nấu nước dùng thanh ngọt từ củ sen và nấm đông cô...',
      categoryId: '1',
    },
    postType: 'VIDEO',
  });

  assert.equal(capturedConfig.url, '/videos');
  assert.equal(capturedConfig.method, 'POST');
  assert.deepEqual(capturedConfig.data, {
    title: 'Video nấu phở nấm',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    transcript: 'Chi tiết cách nấu nước dùng thanh ngọt từ củ sen và nấm đông cô...',
    categoryId: 1,
  });
  assert.equal(result.post_id, 202);
  assert.equal(result.title, 'Video nấu phở nấm');
});

test('deletePost calls DELETE /videos/:id when postType is VIDEO', async () => {
  let capturedUrl = null;
  apiClient.delete = async (url) => {
    capturedUrl = url;
    return { success: true, message: 'Video deleted successfully' };
  };

  const res = await deletePost(77, 'VIDEO');
  assert.equal(capturedUrl, '/videos/77');
  assert.equal(res.success, true);
});

test('togglePostVote handles upvote and cancel vote', async () => {
  let postUrl = null;
  let postData = null;
  let deleteUrl = null;

  apiClient.post = async (url, data) => {
    postUrl = url;
    postData = data;
    return { success: true };
  };

  apiClient.delete = async (url) => {
    deleteUrl = url;
    return { success: true };
  };

  // Upvote
  await togglePostVote({ postId: 7, hasVote: false });
  assert.equal(postUrl, '/votes');
  assert.deepEqual(postData, { post_id: 7, vote_type: 'UPVOTE' });

  // Cancel vote
  await togglePostVote({ postId: 7, hasVote: true });
  assert.equal(deleteUrl, '/votes/post/7');
});

test('createReport formats payload with post or comment target', async () => {
  let capturedData = null;
  apiClient.post = async (url, data) => {
    capturedData = data;
    return { success: true };
  };

  await createReport({ postId: 12, reason: 'Nội dung vi phạm tiêu chuẩn' });
  assert.deepEqual(capturedData, {
    post_id: 12,
    reason: 'Nội dung vi phạm tiêu chuẩn',
  });
});
