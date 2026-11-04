// D:/SWP391/SWP391/client/test/communityOwnPosts.test.jsx
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useCommunity } from '../src/features/community/hooks/useCommunity.js';
import CommunityPost from '../src/features/community/components/CommunityPost.jsx';
import PostComposer from '../src/features/community/components/PostComposer.jsx';
import PostComments from '../src/features/community/components/PostComments.jsx';
import apiClient from '../src/services/apiClient.js';

const database = vi.hoisted(() => ({ data: { posts: [], categories: [] }, user: { user_id: 7, full_name: 'Chủ bài viết' }, reload: vi.fn() }));
vi.mock('../src/hooks/useDatabase.js', () => ({ useDatabase: () => database }));
vi.mock('../src/services/apiClient.js', () => ({ default: { get: vi.fn(), request: vi.fn() } }));
vi.mock('../src/features/community/hooks/useContentModeration.js', () => ({ useContentModeration: () => ({ refresh: vi.fn() }) }));

function privatePost(status) {
  const attachments = [
    { id: 11, url: '/uploads/posts/meal.jpg', type: 'image', name: 'meal.jpg' },
    { id: 12, url: '/uploads/posts/kitchen.jpg', type: 'image', name: 'kitchen.jpg' },
  ];
  const comments = [{ comment_id: 3, content: 'Cảm ơn chia sẻ', user_full_name: 'Người bình luận' }];
  return { title: 'Bữa chay của tôi', content: 'Chia sẻ bữa ăn', attachments, comments,
    post: { post_id: 9, author_id: 7, post_type: 'BLOG', status, created_at: '2026-11-03T00:00:00Z',
      attachments: attachments.map((item) => ({ attachment_id: item.id, file_url: item.url, file_type: item.type, file_name: item.name })),
      comments: [{ comment_id: 3, content: 'Cảm ơn chia sẻ', user: { full_name: 'Người bình luận' } }] } };
}

function OwnPosts() {
  const community = useCommunity();
  const [editing, setEditing] = useState(null);
  const [commenting, setCommenting] = useState(null);
  return <>{community.ownPosts.map((post) => <div key={post.post_id}>
    <CommunityPost post={post} user={community.user} onEdit={setEditing} />
    <button onClick={() => setCommenting(post)}>Xem bình luận</button>
  </div>)}{commenting && <PostComments post={commenting} onClose={() => setCommenting(null)} />}
  {editing && <PostComposer post={editing} user={community.user} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}</>;
}

beforeEach(() => { vi.clearAllMocks(); apiClient.request.mockResolvedValue({ data: { blog: { post_id: 9 } } }); });
afterEach(cleanup);

it.each(['PENDING_MODERATION', 'HIDDEN_BY_AI', 'DRAFT'])('keeps normalized media and comment authors on an own %s post', async (status) => {
  apiClient.get.mockResolvedValue({ data: [privatePost(status)] });
  render(<OwnPosts />);
  expect((await screen.findByAltText('Ảnh đính kèm: meal.jpg')).getAttribute('src')).toContain('/uploads/posts/meal.jpg');
  fireEvent.click(screen.getByRole('button', { name: 'Xem bình luận' }));
  expect(screen.getByText('Người bình luận')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sửa bài viết Bữa chay của tôi' }));
  const editor = screen.getByText('Chỉnh sửa nội dung').closest('[role="dialog"]');
  fireEvent.click(within(editor).getByRole('button', { name: 'Gỡ meal.jpg' }));
  expect(within(editor).queryByAltText('Ảnh đính kèm: meal.jpg')).toBeNull();
  expect(within(editor).getByAltText('Ảnh đính kèm: kitchen.jpg')).toBeTruthy();
  fireEvent.click(within(editor).getByRole('button', { name: 'Lưu thay đổi' }));
  await waitFor(() => expect(apiClient.request).toHaveBeenCalledWith(expect.objectContaining({
    url: '/blogs/9', method: 'PUT', data: expect.objectContaining({ attachments: [
      { url: '/uploads/posts/kitchen.jpg', type: 'image', name: 'kitchen.jpg' },
    ] }),
  })));
});
