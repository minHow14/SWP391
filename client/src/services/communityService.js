// D:/SWP391/SWP391/client/src/services/communityService.js
import apiClient from './apiClient.js';

const UPLOAD_TIMEOUT_MS = 60000;

export function getContentModerationJobs({ page = 1, limit = 5 } = {}, signal) {
  return apiClient.get('/v1/content-moderation-jobs', { params: { page, limit }, signal });
}

export async function getMyPosts(signal) {
  const response = await apiClient.get('/workspace/mine', { signal });
  return response.data;
}

export async function uploadPostMedia(files, onUploadProgress) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await apiClient.post('/upload/post-media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
    timeout: UPLOAD_TIMEOUT_MS,
  });

  return response?.data?.files || response?.files || [];
}

export async function savePost({ postId, values, attachments = [], postType }) {
  const resolvedType = postType || values.postType || values.post_type || 'BLOG';

  if (resolvedType === 'VIDEO') {
    const payload = {
      title: values.title?.trim() || '',
      video_url: values.videoUrl?.trim() || values.video_url?.trim() || '',
      thumbnail_url: values.thumbnailUrl?.trim() || values.thumbnail_url?.trim() || null,
      transcript: values.transcript?.trim() || values.content?.trim() || '',
      categoryId: values.categoryId ? Number(values.categoryId) : null,
    };

    const response = await apiClient.request({
      url: postId ? `/videos/${postId}` : '/videos',
      method: postId ? 'PUT' : 'POST',
      data: payload,
      timeout: UPLOAD_TIMEOUT_MS,
    });

    return response?.data?.video || response?.video || response?.data || response;
  }

  const payload = {
    title: values.title?.trim() || '',
    content: values.content?.trim() || '',
    categoryId: values.categoryId ? Number(values.categoryId) : null,
    attachments: attachments.map((item) => ({
      url: item.url,
      type: item.type || 'image',
      name: item.name || '',
    })),
  };

  const response = await apiClient.request({
    url: postId ? `/blogs/${postId}` : '/blogs',
    method: postId ? 'PUT' : 'POST',
    data: payload,
    timeout: UPLOAD_TIMEOUT_MS,
  });

  const body = response?.data || response;
  const blog = body?.blog || response?.blog || body;
  return { ...blog, ...(body?.jobId && { jobId: body.jobId, moderationStatus: body.moderationStatus }) };
}

export function deletePost(postId, postType) {
  const url = postType === 'VIDEO' ? `/videos/${postId}` : `/blogs/${postId}`;
  return apiClient.delete(url);
}

export function addPostComment(postId, content) {
  return apiClient.post('/comments', { post_id: postId, content });
}

export function togglePostVote({ postId, hasVote }) {
  return hasVote
    ? apiClient.delete(`/votes/post/${postId}`)
    : apiClient.post('/votes', { post_id: postId, vote_type: 'UPVOTE' });
}

export function createReport({ postId, commentId, reason }) {
  return apiClient.post('/reports', {
    ...(postId ? { post_id: postId } : {}),
    ...(commentId ? { comment_id: commentId } : {}),
    reason,
  });
}
