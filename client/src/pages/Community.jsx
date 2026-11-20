// D:/SWP391/SWP391/client/src/pages/Community.jsx
// Trang Cộng đồng: bảng tin và bài viết của tôi, tìm kiếm/lọc blog-video, đăng bài, bình luận và báo cáo vi phạm.
import { useState, useMemo } from 'react';
import { Alert, Button, Container, Spinner } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router';
import { useCommunity } from '../features/community/hooks/useCommunity.js';
import CreatePostCard from '../features/community/components/CreatePostCard.jsx';
import CommunitySearchBar from '../features/community/components/CommunitySearchBar.jsx';
import PostComposer from '../features/community/components/PostComposer.jsx';
import CommunityPost from '../features/community/components/CommunityPost.jsx';
import PostComments from '../features/community/components/PostComments.jsx';
import ReportDialog from '../features/community/components/ReportDialog.jsx';
import ModerationStatusPanel from '../features/community/components/ModerationStatusPanel.jsx';
import { normalizeSearch } from '../utils/recipeFilters.js';
import '../features/community/styles/community.css';

// Component trang cộng đồng; dữ liệu và thao tác lấy từ hook useCommunity.
export default function Community() {
  const community = useCommunity();
  const [searchParams, setSearchParams] = useSearchParams();
  // Từ khóa tìm kiếm khởi tạo từ tham số ?q= để có thể chia sẻ link kết quả tìm kiếm.
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [view, setView] = useState('feed');
  const [filterType, setFilterType] = useState('ALL');
  const [composer, setComposer] = useState(null);
  const [commentId, setCommentId] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);

  const allPosts = view === 'mine' ? community.ownPosts : community.feed;

  const normalizedQuery = normalizeSearch(searchQuery.trim());

  // Lọc bài theo từ khóa trong tiêu đề, nội dung, transcript, tác giả và chuyên mục (không phân biệt dấu).
  const searchedPosts = useMemo(() => {
    if (!normalizedQuery) return allPosts;
    return allPosts.filter((p) => {
      const searchTarget = normalizeSearch(
        `${p.title || ''} ${p.content || ''} ${p.transcript || ''} ${p.author_full_name || ''} ${p.category?.name || ''}`
      );
      return searchTarget.includes(normalizedQuery);
    });
  }, [allPosts, normalizedQuery]);

  // Lọc theo loại nội dung; bài có video_url cũng được tính là video.
  const posts = useMemo(() => {
    if (filterType === 'ALL') return searchedPosts;
    return searchedPosts.filter((p) => p.post_type === filterType || (filterType === 'VIDEO' && p.video_url));
  }, [searchedPosts, filterType]);

  // Đếm số bài blog/video trong kết quả tìm kiếm để hiển thị trên thanh lọc.
  const blogCount = useMemo(
    () => searchedPosts.filter((p) => p.post_type === 'BLOG' && !p.video_url).length,
    [searchedPosts]
  );
  const videoCount = useMemo(
    () => searchedPosts.filter((p) => p.post_type === 'VIDEO' || Boolean(p.video_url)).length,
    [searchedPosts]
  );

  // Cập nhật từ khóa và đồng bộ lên URL (replace để không làm đầy lịch sử trình duyệt).
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    const params = new URLSearchParams(searchParams);
    if (query.trim()) {
      params.set('q', query.trim());
    } else {
      params.delete('q');
    }
    setSearchParams(params, { replace: true });
  };

  const handleClearSearch = () => {
    handleSearchChange('');
  };

  const loading = !community.data || (view === 'mine' && community.mineLoading);
  const error = community.error || (view === 'mine' ? community.mineError : '');
  // Tìm bài đang mở bình luận ở cả bảng tin lẫn bài của tôi.
  const commenting =
    community.data?.posts.find((post) => post.post_id === commentId) ||
    allPosts.find((post) => post.post_id === commentId);

  // Thử tải lại dữ liệu sau lỗi.
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

          {/* Thanh tìm kiếm và bộ lọc loại nội dung Video & Blogs */}
          <CommunitySearchBar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            filterType={filterType}
            onFilterChange={setFilterType}
            totalCount={searchedPosts.length}
            blogCount={blogCount}
            videoCount={videoCount}
            onClear={handleClearSearch}
          />

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
                  <i className={searchQuery.trim() ? 'bi bi-search' : 'bi bi-chat-square-heart'} aria-hidden="true" />
                  <h2>
                    {searchQuery.trim()
                      ? 'Không tìm thấy kết quả phù hợp'
                      : view === 'mine' && !community.user
                        ? 'Bài viết của bạn'
                        : 'Chưa có nội dung phù hợp'}
                  </h2>
                  <p>
                    {searchQuery.trim()
                      ? `Không tìm thấy bài viết hoặc video nào khớp với từ khóa "${searchQuery}".`
                      : view === 'mine' && !community.user
                        ? 'Đăng nhập để xem và quản lý những bài viết hoặc video bạn đã chia sẻ.'
                        : 'Chia sẻ câu chuyện hoặc video đầu tiên của bạn cùng cộng đồng.'}
                  </p>
                  {searchQuery.trim() ? (
                    <Button variant="success" onClick={handleClearSearch}>
                      Xem tất cả bài viết & video
                    </Button>
                  ) : community.user ? (
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
