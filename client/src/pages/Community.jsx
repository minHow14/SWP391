// D:/SWP391/SWP391/client/src/pages/Community.jsx
import { useState, useMemo } from 'react';
import { Alert, Button, Container, Spinner } from 'react-bootstrap';
import { Link } from 'react-router';
import { useCommunity } from '../features/community/hooks/useCommunity.js';
import CreatePostCard from '../features/community/components/CreatePostCard.jsx';
import PostComposer from '../features/community/components/PostComposer.jsx';
import CommunityPost from '../features/community/components/CommunityPost.jsx';
import PostComments from '../features/community/components/PostComments.jsx';
import ReportDialog from '../features/community/components/ReportDialog.jsx';
import ModerationStatusPanel from '../features/community/components/ModerationStatusPanel.jsx';
import '../features/community/styles/community.css';

export default function Community() {
  const community = useCommunity();
  const [view, setView] = useState('feed');
  const [filterType, setFilterType] = useState('ALL');
  const [composer, setComposer] = useState(null);
  const [commentId, setCommentId] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);

  const allPosts = view === 'mine' ? community.ownPosts : community.feed;
  const posts = useMemo(() => {
    if (filterType === 'ALL') return allPosts;
    return allPosts.filter((p) => p.post_type === filterType || (filterType === 'VIDEO' && p.video_url));
  }, [allPosts, filterType]);

  const blogCount = useMemo(
    () => allPosts.filter((p) => p.post_type === 'BLOG' && !p.video_url).length,
    [allPosts]
  );
  const videoCount = useMemo(
    () => allPosts.filter((p) => p.post_type === 'VIDEO' || Boolean(p.video_url)).length,
    [allPosts]
  );

  const loading = !community.data || (view === 'mine' && community.mineLoading);
  const error = community.error || (view === 'mine' ? community.mineError : '');
  const commenting =
    community.data?.posts.find((post) => post.post_id === commentId) ||
    allPosts.find((post) => post.post_id === commentId);

  const retry = () => {
    if (view === 'mine') community.retryMine();
    community.reload().catch(() => {});
  };

  return (
    <main className="cx-explore-page cx-community-page flex-grow-1">
      <Container fluid className="cx-explore-shell cx-community-shell">
        <section className="cx-page-toolbar cx-community-toolbar">
          <div>
            <h1>
              <span className="cx-heading-icon">
                <i className="bi bi-people" aria-hidden="true" />
              </span>
              Cộng đồng ChayXanh
            </h1>
            <p>Chia sẻ câu chuyện, kết nối và lan tỏa lối sống xanh.</p>
          </div>
          <nav className="cx-feed-tabs" aria-label="Bài viết cộng đồng">
            <Button
              variant="link"
              className={view === 'feed' ? 'is-active' : ''}
              aria-pressed={view === 'feed'}
              onClick={() => { setView('feed'); setFilterType('ALL'); }}
            >
              Bảng tin
            </Button>
            <Button
              variant="link"
              className={view === 'mine' ? 'is-active' : ''}
              aria-pressed={view === 'mine'}
              onClick={() => { setView('mine'); setFilterType('ALL'); }}
            >
              Bài viết của tôi
            </Button>
          </nav>
        </section>

        <div className="cx-community-stream">
          <CreatePostCard user={community.user} onCreate={() => setComposer({})} />

          {/* Bộ lọc loại nội dung bảng tin: Tất cả, Bài viết, Video */}
          <div className="d-flex flex-wrap gap-2 my-3">
            <Button
              type="button"
              variant={filterType === 'ALL' ? 'success' : 'light'}
              size="sm"
              className="rounded-pill px-3"
              onClick={() => setFilterType('ALL')}
            >
              Tất cả ({allPosts.length})
            </Button>
            <Button
              type="button"
              variant={filterType === 'BLOG' ? 'success' : 'light'}
              size="sm"
              className="rounded-pill px-3"
              onClick={() => setFilterType('BLOG')}
            >
              <i className="bi bi-journal-richtext me-1" /> Bài viết ({blogCount})
            </Button>
            <Button
              type="button"
              variant={filterType === 'VIDEO' ? 'success' : 'light'}
              size="sm"
              className="rounded-pill px-3"
              onClick={() => setFilterType('VIDEO')}
            >
              <i className="bi bi-play-circle-fill me-1" /> Video ({videoCount})
            </Button>
          </div>

          {community.notice && (
            <Alert
              variant="info"
              dismissible
              onClose={() => community.setNotice('')}
              role="status"
            >
              {community.notice}
            </Alert>
          )}
          {view === 'mine' && community.user && <ModerationStatusPanel moderation={community.moderation} />}

          {error ? (
            <Alert variant="danger">
              {error}
              <Button variant="outline-danger" size="sm" className="ms-3" onClick={retry}>
                Thử lại
              </Button>
            </Alert>
          ) : loading ? (
            <div className="text-center p-5" role="status">
              <Spinner animation="border" variant="success" />
              <p className="mt-3">Đang tải bài viết…</p>
            </div>
          ) : (
            <div
              className="cx-community-posts"
              aria-label={view === 'mine' ? 'Bài viết của tôi' : 'Bảng tin'}
            >
              {posts.map((post) => (
                <CommunityPost
                  key={post.post_id}
                  post={post}
                  user={community.user}
                  voting={community.votingIds.includes(post.post_id)}
                  onEdit={setComposer}
                  onDelete={community.removePost}
                  onVote={community.vote}
                  onComment={setCommentId}
                  onReport={setReportTarget}
                />
              ))}
              {!posts.length && (
                <section className="cx-empty-state">
                  <i className="bi bi-chat-square-heart" aria-hidden="true" />
                  <h2>
                    {view === 'mine' && !community.user
                      ? 'Bài viết của bạn'
                      : 'Chưa có nội dung phù hợp'}
                  </h2>
                  <p>
                    {view === 'mine' && !community.user
                      ? 'Đăng nhập để xem và quản lý những bài viết hoặc video bạn đã chia sẻ.'
                      : 'Chia sẻ câu chuyện hoặc video đầu tiên của bạn cùng cộng đồng.'}
                  </p>
                  {community.user ? (
                    <Button variant="success" onClick={() => setComposer({})}>
                      Tạo bài đăng
                    </Button>
                  ) : (
                    <Button as={Link} to="/dang-nhap" variant="success">
                      Đăng nhập
                    </Button>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </Container>

      {composer && community.user && (
        <PostComposer
          post={composer}
          user={community.user}
          categories={community.categories}
          onClose={() => setComposer(null)}
          onSaved={(blog) => {
            community.postSaved(blog);
            if (blog.jobId) setView('mine');
            setComposer(null);
          }}
        />
      )}
      {commenting && (
        <PostComments
          post={commenting}
          user={community.user}
          show={!reportTarget}
          onClose={() => setCommentId(null)}
          onComment={community.comment}
          onReport={setReportTarget}
        />
      )}
      {reportTarget && (
        <ReportDialog
          target={reportTarget}
          user={community.user}
          onClose={() => setReportTarget(null)}
          onReportSuccess={(msg) => community.setNotice(msg)}
        />
      )}
    </main>
  );
}
