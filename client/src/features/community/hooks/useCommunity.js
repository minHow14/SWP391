// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/community/hooks/useCommunity.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDatabase } from '../../../hooks/useDatabase.js';
import { getMyPosts, addPostComment, togglePostVote } from '../../../services/communityService.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../../utils/syncEvents.js';

function normalizePost(blog, user) {
  const post = { ...blog, ...blog.post };
  return { ...post, author_full_name: post.author?.full_name || user?.full_name,
    initials: (post.author?.full_name || user?.full_name || '').slice(0, 1),
    comments: post.comments || [], vote_count: post.vote_count || 0 };
}

function combinePosts(posts, updates) {
  const merged = new Map(posts.map(post => [post.post_id, post]));
  updates.forEach(post => merged.set(post.post_id, { ...merged.get(post.post_id), ...post }));
  return Array.from(merged.values()).sort((left, right) =>
    Date.parse(right.created_at) - Date.parse(left.created_at) || right.post_id - left.post_id);
}

export function useCommunity() {
  const { data, user, error, reload } = useDatabase();
  const [mine, setMine] = useState({ userId: null, posts: [], loading: false, error: '' });
  const [saved, setSaved] = useState([]);
  const [notice, setNotice] = useState('');
  const [votingIds, setVotingIds] = useState([]);
  const voteLocks = useRef(new Set());
  const userId = user?.user_id;
  useEffect(() => { setSaved([]); }, [data, userId]);

  const loadMine = useCallback(async signal => {
    if (!userId) return;
    setMine(current => ({ ...current, loading: true, error: '' }));
    try {
      const blogs = await getMyPosts(signal);
      if (!signal?.aborted) setMine({ userId, posts: blogs.map(blog => normalizePost(blog, user)), loading: false, error: '' });
    } catch (failure) {
      if (!signal?.aborted) setMine({ userId, posts: [], loading: false, error: failure.message });
    }
  }, [userId, user]);

  useEffect(() => {
    const controller = new AbortController();
    loadMine(controller.signal);
    const unsubscribe = subscribeSyncEvent(['POST_CHANGED', 'MODERATION_CHANGED'], () => loadMine(controller.signal));
    return () => { controller.abort(); unsubscribe(); };
  }, [loadMine]);

  function postSaved(blog) {
    const previous = data?.posts.find(post => post.post_id === blog.post_id);
    const post = { ...normalizePost(blog, user), comments: previous?.comments || [],
      vote_count: previous?.vote_count || 0, post_votes: previous?.post_votes || [] };
    setSaved(current => combinePosts(current, [post]));
    setNotice('Đã lưu bài viết của bạn.');
    emitSyncEvent('POST_CHANGED');
  }

  async function vote(post) {
    if (!userId || voteLocks.current.has(post.post_id)) return;
    voteLocks.current.add(post.post_id);
    setVotingIds(Array.from(voteLocks.current));
    try {
      await togglePostVote({ postId: post.post_id, hasVote: post.post_votes?.some(item => item.user_id === userId) });
      await reload();
      emitSyncEvent('POST_CHANGED');
    } catch (failure) { setNotice(failure.message); }
    finally { voteLocks.current.delete(post.post_id); setVotingIds(Array.from(voteLocks.current)); }
  }

  async function comment(postId, content) {
    await addPostComment(postId, content);
    emitSyncEvent('COMMENT_CHANGED');
  }

  const catalog = data?.posts || [];
  const feed = catalog.filter(post => post.post_type === 'BLOG');
  const ownPosts = mine.userId === userId ? mine.posts.map(post => catalog.find(item => item.post_id === post.post_id) || post) : [];
  return { user, data, error, reload, notice, setNotice, votingIds, vote, comment, postSaved,
    feed: combinePosts(feed, saved.filter(post => post.status === 'PUBLISHED')),
    ownPosts: userId ? combinePosts(ownPosts, saved.filter(post => post.author_id === userId)) : [],
    mineLoading: Boolean(userId && (mine.loading || mine.userId !== userId)),
    mineError: mine.userId === userId ? mine.error : '', retryMine: loadMine };
}
