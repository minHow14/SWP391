// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/Community.jsx
import { useState } from 'react';
import { Alert, Button, Container, Spinner } from 'react-bootstrap';
import { Link } from 'react-router';
import { useCommunity } from '../features/community/hooks/useCommunity.js';
import CreatePostCard from '../features/community/components/CreatePostCard.jsx';
import PostComposer from '../features/community/components/PostComposer.jsx';
import CommunityPost from '../features/community/components/CommunityPost.jsx';
import PostComments from '../features/community/components/PostComments.jsx';
import ReportDialog from '../features/community/components/ReportDialog.jsx';
import '../features/community/styles/community.css';

export default function Community() {
  const community = useCommunity();
  const [view, setView] = useState('feed');
  const [composer, setComposer] = useState(null);
  const [commentId, setCommentId] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const posts = view === 'mine' ? community.ownPosts : community.feed;
  const loading = !community.data || (view === 'mine' && community.mineLoading);
  const error = community.error || (view === 'mine' ? community.mineError : '');
  const commenting = community.data?.posts.find(post => post.post_id === commentId)
    || posts.find(post => post.post_id === commentId);
  const retry = () => {
    if (view === 'mine') community.retryMine();
    community.reload().catch(() => {});
  };

  return <main className="cx-explore-page cx-community-page flex-grow-1">
    <Container fluid className="cx-explore-shell cx-community-shell">
      <section className="cx-page-toolbar cx-community-toolbar">
        <div><h1><span className="cx-heading-icon"><i className="bi bi-people" aria-hidden="true" /></span>Cộng đồng ChayXanh</h1>
          <p>Chia sẻ câu chuyện, kết nối và lan tỏa lối sống xanh.</p></div>
        <nav className="cx-feed-tabs" aria-label="Bài viết cộng đồng">
          <Button variant="link" className={view === 'feed' ? 'is-active' : ''} aria-pressed={view === 'feed'} onClick={() => setView('feed')}>Bảng tin</Button>
          <Button variant="link" className={view === 'mine' ? 'is-active' : ''} aria-pressed={view === 'mine'} onClick={() => setView('mine')}>Bài viết của tôi</Button>
        </nav>
      </section>
      <div className="cx-community-stream">
        <CreatePostCard user={community.user} onCreate={() => setComposer({})} />
        {community.notice && <Alert variant="info" dismissible onClose={() => community.setNotice('')} role="status">{community.notice}</Alert>}
        {error ? <Alert variant="danger">{error}<Button variant="outline-danger" size="sm" className="ms-3" onClick={retry}>Thử lại</Button></Alert>
          : loading ? <div className="text-center p-5" role="status"><Spinner animation="border" variant="success" /><p className="mt-3">Đang tải bài viết…</p></div>
            : <div className="cx-community-posts" aria-label={view === 'mine' ? 'Bài viết của tôi' : 'Bảng tin'}>
              {posts.map(post => <CommunityPost key={post.post_id} post={post} user={community.user}
                voting={community.votingIds.includes(post.post_id)} onEdit={setComposer} onVote={community.vote} onComment={setCommentId} onReport={setReportTarget} />)}
              {!posts.length && <section className="cx-empty-state"><i className="bi bi-chat-square-heart" aria-hidden="true" />
                <h2>{view === 'mine' && !community.user ? 'Bài viết của bạn' : 'Chưa có bài viết'}</h2>
                <p>{view === 'mine' && !community.user ? 'Đăng nhập để xem và quản lý những bài viết bạn đã chia sẻ.' : 'Chia sẻ câu chuyện đầu tiên của bạn cùng cộng đồng.'}</p>
                {community.user ? <Button variant="success" onClick={() => setComposer({})}>Tạo bài viết</Button>
                  : <Button as={Link} to="/dang-nhap" variant="success">Đăng nhập</Button>}
              </section>}
            </div>}
      </div>
    </Container>
    {composer && community.user && <PostComposer post={composer} user={community.user}
      onClose={() => setComposer(null)} onSaved={blog => { community.postSaved(blog); setComposer(null); }} />}
    {commenting && <PostComments post={commenting} user={community.user} show={!reportTarget}
      onClose={() => setCommentId(null)} onComment={community.comment} onReport={setReportTarget} />}
    {reportTarget && <ReportDialog target={reportTarget} user={community.user} onClose={() => setReportTarget(null)} />}
  </main>;
// client/src/pages/Community.jsx
import { useEffect, useState, useCallback } from 'react';
import { useDatabase } from '../lib/databaseContext.js';
import { api, getSession } from '../lib/api.js';
import ContentDialog from '../components/ContentDialog.jsx';
import { formatCreatedAt } from '../lib/modelFields.js';
import { emitSyncEvent, subscribeSyncEvent } from '../lib/syncEvents.js';

export default function Community() {
  const { data, user, reload } = useDatabase();
  const [mine, setMine] = useState([]);
  const [view, setView] = useState('feed');
  const [category, setCategory] = useState(null);
  const [composer, setComposer] = useState(null);
  const [commentId, setCommentId] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadMine = useCallback(async () => {
    if (!user) {
      setMine([]);
      return;
    }
    try {
      const blogs = await api('/workspace/mine');
      if (getSession()?.user?.user_id === user.user_id) {
        setMine(
          blogs.map((b) => ({
            ...b,
            ...b.post,
            author_full_name: user.full_name,
            initials: user.full_name ? user.full_name.slice(0, 1) : '',
            category_id: b.post?.post_categories?.[0]?.category_id || null,
            comments: [],
            vote_count: 0,
          }))
        );
      }
    } catch (e) {
      setNotice(e.message);
    }
  }, [user]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  useEffect(() => {
    const unsubscribe = subscribeSyncEvent(
      ['POST_CHANGED', 'COMMENT_CHANGED', 'MODERATION_CHANGED'],
      () => {
        loadMine();
      }
    );
    return unsubscribe;
  }, [loadMine]);

  const ownPosts = user
    ? mine
        .filter((p) => p.author_id === user.user_id)
        .map((p) => data.posts.find((post) => post.post_id === p.post_id) || p)
    : [];
  const posts = (view === 'mine' ? ownPosts : data.posts.filter((p) => p.post_type === 'BLOG')).filter(
    (p) => category === null || p.category_id === category
  );
  const categories = data.categories.filter((c) => data.posts.some((p) => p.category_id === c.category_id));
  const commenting = data.posts.find((p) => p.post_id === commentId);

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api(composer.post_id ? `/blogs/${composer.post_id}` : '/blogs', {
        method: composer.post_id ? 'PUT' : 'POST',
        body: { title: values.get('title'), content: values.get('content') },
      });
      await reload();
      await loadMine();
      emitSyncEvent('POST_CHANGED');
      setComposer(null);
      setNotice('Đã lưu bài viết.');
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function comment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      await api('/comments', {
        method: 'POST',
        body: { post_id: commentId, content: values.get('content') },
      });
      await reload();
      emitSyncEvent('COMMENT_CHANGED');
      form.reset();
    } catch (e) {
      setNotice(e.message);
    }
  }

  async function vote(post) {
    try {
      const own = post.post_votes?.find((v) => v.user_id === user?.user_id);
      await api(own ? `/votes/post/${post.post_id}` : '/votes', {
        method: own ? 'DELETE' : 'POST',
        ...(own ? {} : { body: { post_id: post.post_id, vote_type: 'UPVOTE' } }),
      });
      await reload();
      emitSyncEvent('POST_CHANGED');
    } catch (e) {
      setNotice(e.message);
    }
  }

  return (
    <main className="cx-explore-page flex-grow-1">
      <div className="container-fluid cx-explore-shell cx-community-shell">
        <section className="cx-page-toolbar">
          <div className="d-flex justify-content-between flex-wrap gap-3">
            <div>
              <h1>🌿 Cộng Đồng ChayXanh</h1>
              <p>Chia sẻ bài viết và trao đổi cùng cộng đồng.</p>
            </div>
            <div className="cx-feed-tabs">
              <button className={view === 'feed' ? 'is-active' : ''} onClick={() => setView('feed')}>
                Bảng Tin
              </button>
              <button className={view === 'mine' ? 'is-active' : ''} onClick={() => setView('mine')}>
                Bài Viết Của Tôi
              </button>
              <button disabled={!user} onClick={() => setComposer({})}>
                Đăng Bài Viết Mới
              </button>
            </div>
          </div>
          {!user && <p className="mt-3">Đăng nhập để viết bài, thích và bình luận.</p>}
        </section>
        <div className="cx-category-filters mb-4">
          <button onClick={() => setCategory(null)}>Tất cả</button>
          {categories.map((c) => (
            <button key={c.category_id} onClick={() => setCategory(c.category_id)}>
              {c.name}
            </button>
          ))}
        </div>
        {notice && (
          <p role="status" className="alert alert-info">
            {notice}
          </p>
        )}
        <div className="row g-4">
          {posts.map((p) => (
            <div className="col-lg-6" key={p.post_id}>
              <article className="cx-post-card h-100">
                <div className="cx-post-body">
                  <div className="cx-post-author-row">
                    <span className="cx-post-avatar">{p.initials}</span>
                    <div className="flex-grow-1">
                      <strong>{p.author_full_name}</strong>
                      <span className="cx-post-metadata">
                        {formatCreatedAt(p.created_at)} · {p.status}
                      </span>
                    </div>
                    {p.author_id === user?.user_id && (
                      <button className="btn btn-sm btn-outline-success" onClick={() => setComposer(p)}>
                        Sửa
                      </button>
                    )}
                  </div>
                  <h2>{p.title}</h2>
                  <p className="cx-post-text">{p.content}</p>
                </div>
                <div className="cx-post-actions">
                  <button disabled={!user} onClick={() => vote(p)}>
                    {p.vote_count} Thích
                  </button>
                  <button onClick={() => setCommentId(p.post_id)}>
                    {p.comments.length} Bình luận
                  </button>
                </div>
              </article>
            </div>
          ))}
        </div>
        {!posts.length && (
          <p className="p-4 text-center">
            {view === 'mine' && !user
              ? 'Đăng nhập để xem bài viết của bạn.'
              : 'Chưa có bài viết trong chủ đề này.'}
          </p>
        )}
      </div>
      {composer && (
        <ContentDialog
          title={composer.post_id ? 'Chỉnh sửa bài viết' : 'Chia sẻ với cộng đồng'}
          onClose={() => setComposer(null)}
        >
          <form className="cx-journal-entry-form" onSubmit={save}>
            <label>
              Tiêu đề
              <input name="title" required maxLength={255} defaultValue={composer.title || ''} />
            </label>
            <label>
              Nội dung
              <textarea
                name="content"
                required
                maxLength={50000}
                rows={6}
                className="form-control"
                defaultValue={composer.content || ''}
              />
            </label>
            <button disabled={busy}>Lưu Bài Viết</button>
          </form>
        </ContentDialog>
      )}
      {commentId && (
        <ContentDialog
          title={commenting?.title || 'Bình luận'}
          onClose={() => setCommentId(null)}
        >
          {commenting?.comments.map((c) => (
            <article className="p-3 border-bottom" key={c.comment_id}>
              <strong>{c.user_full_name}</strong>
              <p>{c.content}</p>
            </article>
          ))}
          {user ? (
            <form onSubmit={comment} className="mt-3">
              <label className="form-label" htmlFor="db-comment">
                Bình luận của bạn
              </label>
              <textarea id="db-comment" name="content" required maxLength={5000} className="form-control" />
              <button className="btn btn-success mt-3">Gửi bình luận</button>
            </form>
          ) : (
            <p>Đăng nhập để bình luận.</p>
          )}
        </ContentDialog>
      )}
    </main>
  );
}
