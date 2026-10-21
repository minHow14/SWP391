// client/src/pages/Community.jsx
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
  const commenting =
    community.data?.posts.find((post) => post.post_id === commentId) ||
    posts.find((post) => post.post_id === commentId);

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
              onClick={() => setView('feed')}
            >
              Bảng tin
            </Button>
            <Button
              variant="link"
              className={view === 'mine' ? 'is-active' : ''}
              aria-pressed={view === 'mine'}
              onClick={() => setView('mine')}
            >
              Bài viết của tôi
            </Button>
          </nav>
        </section>
        <div className="cx-community-stream">
          <CreatePostCard user={community.user} onCreate={() => setComposer({})} />
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
                      : 'Chưa có bài viết'}
                  </h2>
                  <p>
                    {view === 'mine' && !community.user
                      ? 'Đăng nhập để xem và quản lý những bài viết bạn đã chia sẻ.'
                      : 'Chia sẻ câu chuyện đầu tiên của bạn cùng cộng đồng.'}
                  </p>
                  {community.user ? (
                    <Button variant="success" onClick={() => setComposer({})}>
                      Tạo bài viết
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
          onClose={() => setComposer(null)}
          onSaved={(blog) => {
            community.postSaved(blog);
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
        />
      )}
    </main>
  );
}
