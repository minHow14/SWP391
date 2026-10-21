// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/services/communityService.js
import apiClient from './apiClient.js';

const UPLOAD_TIMEOUT_MS = 180000;

export async function getMyPosts(signal) {
  const response = await apiClient.get('/workspace/mine', { signal });
  return response.data;
}

export async function savePost({ postId, values, attachments }, onUploadProgress) {
  const body = new FormData();
  body.append('title', values.title);
  body.append('content', values.content);
  if (postId) body.append('retainedAttachmentIds', JSON.stringify(
    attachments.filter(item => !item.file).map(item => item.id),
  ));
  attachments.filter(item => item.file).forEach(item => body.append('attachments', item.file));
  const response = await apiClient.request({
    url: postId ? `/blogs/${postId}` : '/blogs', method: postId ? 'PUT' : 'POST',
    data: body, headers: { 'Content-Type': undefined }, timeout: UPLOAD_TIMEOUT_MS, onUploadProgress,
  });
  return response.data.blog;
}

export function addPostComment(postId, content) {
  return apiClient.post('/comments', { post_id: postId, content });
}

export function togglePostVote({ postId, hasVote }) {
  return hasVote ? apiClient.delete(`/votes/post/${postId}`)
    : apiClient.post('/votes', { post_id: postId, vote_type: 'UPVOTE' });
}
