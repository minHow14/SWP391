// D:/SWP391/SWP391/client/src/features/community/hooks/useCommunity.js
// Hook quản lý dữ liệu trang cộng đồng: bảng tin, bài viết của tôi, thích, bình luận, xóa bài và trạng thái kiểm duyệt.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDatabase } from '../../../hooks/useDatabase.js';
import {
  getMyPosts,
  addPostComment,
  togglePostVote,
  deletePost as deletePostApi,
} from '../../../services/communityService.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../../utils/syncEvents.js';
import { useContentModeration } from './useContentModeration.js';

// Chuẩn hóa dữ liệu bài viết từ API (gộp blog + post) và bổ sung tên tác giả, chữ cái đại diện, giá trị mặc định.
function normalizePost(blog, user) {
  const post = { ...blog.post, ...blog };
  return {
    ...post,
    author_full_name: post.author?.full_name || user?.full_name,
    initials: (post.author?.full_name || user?.full_name || '').slice(0, 1),
    comments: post.comments || [],
    vote_count: post.vote_count || 0,
  };
}

// Gộp danh sách bài viết với các bản cập nhật (ghi đè theo post_id), sắp xếp mới nhất trước.
function combinePosts(posts, updates) {
  const merged = new Map(posts.map((post) => [post.post_id, post]));
  updates.forEach((post) => merged.set(post.post_id, { ...merged.get(post.post_id), ...post }));
  return Array.from(merged.values()).sort(
    (left, right) =>
      Date.parse(right.created_at) - Date.parse(left.created_at) || right.post_id - left.post_id
  );
}

// Hook trang cộng đồng; trả về dữ liệu đã chuẩn hóa cùng các hành động thao tác bài viết.
export function useCommunity() {
  const { data, user, error, reload } = useDatabase();
  const [mine, setMine] = useState({ userId: null, posts: [], loading: false, error: '' });
  const [saved, setSaved] = useState([]);
  const [notice, setNotice] = useState('');
  const [votingIds, setVotingIds] = useState([]);
  // Khóa theo post_id để chặn bấm thích liên tục gây gửi nhiều request đảo ngược nhau.
  const voteLocks = useRef(new Set());
  const userId = user?.user_id;
  const refreshModeratedContent = useCallback(() => {
    emitSyncEvent('MODERATION_CHANGED');
  }, []);
  const moderation = useContentModeration({ userId, onSettled: refreshModeratedContent });

  // Dữ liệu gốc hoặc người dùng thay đổi -> bỏ các bản lưu tạm cục bộ vì đã có dữ liệu mới từ server.
  useEffect(() => {
    setSaved([]);
  }, [data, userId]);

  // Tải danh sách bài viết của người dùng hiện tại (gồm cả bài chưa công khai).
  const loadMine = useCallback(
    async (signal) => {
      if (!userId) return;
      setMine((current) => ({ ...current, loading: true, error: '' }));
      try {
        const blogs = await getMyPosts(signal);
        if (!signal?.aborted) {
          setMine({
            userId,
            posts: blogs.map((blog) => normalizePost(blog, user)),
            loading: false,
            error: '',
          });
        }
      } catch (failure) {
        if (!signal?.aborted) {
          setMine({ userId, posts: [], loading: false, error: failure.message });
        }
      }
    },
    [userId, user]
  );

  // Tải bài của tôi lần đầu và tải lại khi có sự kiện bài viết / kiểm duyệt thay đổi ở nơi khác.
  useEffect(() => {
    const controller = new AbortController();
    loadMine(controller.signal);
    const unsubscribe = subscribeSyncEvent(['POST_CHANGED', 'MODERATION_CHANGED'], () =>
      loadMine(controller.signal)
    );
    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [loadMine]);

  // Xử lý sau khi lưu bài: cập nhật lạc quan vào danh sách, giữ lại bình luận/lượt thích cũ rồi tải lại dữ liệu.
  async function postSaved(blog) {
    const previous = data?.posts.find((post) => post.post_id === blog.post_id);
    const post = {
      ...normalizePost(blog, user),
      comments: previous?.comments || [],
      vote_count: previous?.vote_count || 0,
      post_votes: previous?.post_votes || [],
    };
    setSaved((current) => combinePosts(current, [post]));
    setNotice(blog.jobId ? 'Đã lưu bài viết. Nội dung đang chờ kiểm duyệt trước khi công khai.' : 'Đã lưu bài viết của bạn.');
    moderation.refresh();
    await reload().catch(() => {});
    emitSyncEvent('POST_CHANGED');
  }

  // Xóa bài viết; chỉ tác giả mới được xóa.
  async function removePost(post) {
    if (!userId || post.author_id !== userId) return;
    try {
      await deletePostApi(post.post_id, post.post_type);
      setSaved((current) => current.filter((item) => item.post_id !== post.post_id));
      setMine((current) => ({
        ...current,
        posts: current.posts.filter((item) => item.post_id !== post.post_id),
      }));
      setNotice('Đã xóa vĩnh viễn bài viết thành công.');
      await reload().catch(() => {});
      emitSyncEvent('POST_CHANGED');
    } catch (failure) {
      setNotice(failure.message || 'Không thể xóa bài viết. Vui lòng thử lại.');
    }
  }

  // Thích / bỏ thích bài viết rồi tải lại để đồng bộ số lượt thích.
  async function vote(post) {
    if (!userId || voteLocks.current.has(post.post_id)) return;
    voteLocks.current.add(post.post_id);
    setVotingIds(Array.from(voteLocks.current));
    try {
      await togglePostVote({
        postId: post.post_id,
        hasVote: post.post_votes?.some((item) => item.user_id === userId),
      });
      await reload();
      emitSyncEvent('POST_CHANGED');
    } catch (failure) {
      setNotice(failure.message);
    } finally {
      voteLocks.current.delete(post.post_id);
      setVotingIds(Array.from(voteLocks.current));
    }
  }

  // Gửi bình luận và làm mới trạng thái kiểm duyệt (bình luận có thể phải chờ duyệt).
  async function comment(postId, content) {
    const response = await addPostComment(postId, content);
    const result = response.data || response;
    moderation.refresh();
    emitSyncEvent('COMMENT_CHANGED');
    return result;
  }

  const catalog = data?.posts || [];
  const feed = catalog.filter((post) => post.post_type === 'BLOG' || post.post_type === 'VIDEO');
  // Bài đã công khai thì lấy bản trong catalog chung (có đủ bình luận, lượt thích mới nhất).
  const ownPosts =
    mine.userId === userId
      ? mine.posts.map((post) => post.status === 'PUBLISHED' ? catalog.find((item) => item.post_id === post.post_id) || post : post)
      : [];
  // Bài vừa lưu nhưng chưa công khai thì ẩn khỏi bảng tin chung.
  const unpublishedIds = new Set(saved.filter((post) => post.status !== 'PUBLISHED').map((post) => post.post_id));

  return {
    user,
    data,
    categories: data?.categories || [],
    error,
    reload,
    notice,
    setNotice,
    votingIds,
    vote,
    comment,
    postSaved,
    removePost,
    feed: combinePosts(feed.filter((post) => !unpublishedIds.has(post.post_id)), saved.filter((post) => post.status === 'PUBLISHED')),
    ownPosts: userId ? combinePosts(ownPosts, saved.filter((post) => post.author_id === userId)) : [],
    mineLoading: Boolean(userId && (mine.loading || mine.userId !== userId)),
    mineError: mine.userId === userId ? mine.error : '',
    retryMine: loadMine,
    moderation,
  };
}
