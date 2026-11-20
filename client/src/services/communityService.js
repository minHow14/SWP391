// D:/SWP391/SWP391/client/src/services/communityService.js
// Dịch vụ cộng đồng: bài viết blog/video, tải tệp đính kèm, bình luận, bình chọn và báo cáo vi phạm.
import apiClient from './apiClient.js';

// Upload tệp và tạo bài có thể lâu hơn timeout mặc định nên cho phép tối đa 60 giây.
const UPLOAD_TIMEOUT_MS = 60000;

// Lấy danh sách job kiểm duyệt nội dung của người dùng (có phân trang).
export function getContentModerationJobs({ page = 1, limit = 5 } = {}, signal) {
  return apiClient.get('/v1/content-moderation-jobs', { params: { page, limit }, signal });
}

// Lấy các bài viết của chính người dùng.
export async function getMyPosts(signal) {
  const response = await apiClient.get('/workspace/mine', { signal });
  return response.data;
}

// Tải lên tệp ảnh/video cho bài viết; trả về danh sách tệp đã lưu trên server.
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

// Tạo mới hoặc cập nhật bài viết; video và blog dùng endpoint, payload khác nhau.
// Kết quả kèm jobId/moderationStatus nếu bài được đưa vào hàng đợi kiểm duyệt.
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

    const body = response?.data || response;
    const video = body?.video || response?.video || body;
    return { ...video, ...(body?.jobId && { jobId: body.jobId, moderationStatus: body.moderationStatus }) };
  }

  const payload = {
    title: values.title?.trim() || '',
    content: values.content?.trim() || '',
    categoryId: values.categoryId ? Number(values.categoryId) : null,
    attachments: attachments.map((item) => ({
      url: item.url,
      type: String(item.type || 'image').trim().toLowerCase(),
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

// Xóa bài viết theo loại (video hoặc blog).
export function deletePost(postId, postType) {
  const url = postType === 'VIDEO' ? `/videos/${postId}` : `/blogs/${postId}`;
  return apiClient.delete(url);
}

// Thêm bình luận vào bài viết.
export function addPostComment(postId, content) {
  return apiClient.post('/comments', { post_id: postId, content });
}

// Bật/tắt bình chọn: đã bình chọn thì gỡ, chưa thì thêm UPVOTE.
export function togglePostVote({ postId, hasVote }) {
  return hasVote
    ? apiClient.delete(`/votes/post/${postId}`)
    : apiClient.post('/votes', { post_id: postId, vote_type: 'UPVOTE' });
}

// Gửi báo cáo vi phạm cho bài viết hoặc bình luận.
export function createReport({ postId, commentId, reason }) {
  return apiClient.post('/reports', {
    ...(postId ? { post_id: postId } : {}),
    ...(commentId ? { comment_id: commentId } : {}),
    reason,
  });
}
