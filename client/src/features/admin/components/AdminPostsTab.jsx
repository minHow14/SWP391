// D:/SWP391/SWP391/client/src/features/admin/components/AdminPostsTab.jsx
import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { adminService } from '../../../services/adminService.js';
import AdminPagination from './AdminPagination.jsx';
import { useAdminPagination } from '../hooks/useAdminPagination.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../../utils/syncEvents.js';
import { useDatabase } from '../../../hooks/useDatabase.js';
import PostComposer from '../../community/components/PostComposer.jsx';

export default function AdminPostsTab() {
  const { user } = useDatabase();
  const [categories, setCategories] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  const fetchPage = useCallback(
    (pagination) =>
      adminService.getPosts({
        postType: typeFilter,
        status: statusFilter,
        search,
        ...pagination,
      }),
    [typeFilter, statusFilter, search]
  );

  const pagination = useAdminPagination({
    fetchPage,
    filterKey: JSON.stringify([typeFilter, statusFilter, search]),
    limit: 50,
    errorMessage: 'Không thể tải danh sách bài viết',
  });

  const { data: posts, loading, error, setError, refresh: fetchPosts } = pagination;

  // Tự động nạp danh mục bài viết khi vào trang
  useEffect(() => {
    adminService
      .getCategories()
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  // Tự động cập nhật danh sách bài viết khi có tác động từ các tab/trang khác
  useEffect(() => {
    const unsubscribe = subscribeSyncEvent(
      ['POST_CHANGED', 'MODERATION_CHANGED', 'REPORT_CHANGED', 'CATEGORY_CHANGED', 'USER_CHANGED'],
      () => {
        fetchPosts();
      }
    );
    return unsubscribe;
  }, [fetchPosts]);

  const handleUpdateStatus = async (postId, status) => {
    try {
      await adminService.updatePostStatus(postId, status);
      setActionMsg(`Đã cập nhật trạng thái bài viết thành công`);
      emitSyncEvent('POST_CHANGED', { postId, status });
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeletePost = async (post) => {
    const postId = typeof post === 'object' ? post.post_id : post;
    const currentPost = typeof post === 'object' ? post : posts.find((item) => item.post_id === postId);
    const postTitle = currentPost?.blog?.title || currentPost?.video?.title || `bài đăng #${postId}`;
    const contentType = currentPost?.post_type === 'BLOG' ? 'bài viết' : 'video';

    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn ${contentType} "${postTitle}"? Hành động này không thể hoàn tác.`)) {
      return;
    }
    try {
      await adminService.deletePost(postId, { permanent: true });
      setActionMsg(`Đã xóa vĩnh viễn ${contentType} thành công`);
      emitSyncEvent('POST_CHANGED', { postId });
      emitSyncEvent('COMMENT_CHANGED');
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartEdit = (post) => {
    setEditingPost(post);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Quản Lý Bài Viết & Video Nấu Ăn</h4>
          <p className="text-muted small mb-0">Xem xét bài đăng cộng đồng, phê duyệt, chỉnh sửa từ ngữ vi phạm hoặc gỡ bỏ</p>
        </div>
      </div>

      {actionMsg && (
        <Alert variant="success" dismissible onClose={() => setActionMsg('')} className="py-2 small rounded-3">
          <i className="bi bi-check-circle-fill me-2" />{actionMsg}
        </Alert>
      )}

      {/* Bộ lọc */}
      <div className="admin-card mb-3 p-3">
        <Row className="g-2">
          <Col xs={12} md={5}>
            <Form.Control
              size="sm"
              className="rounded-3"
              aria-label="Tìm theo tiêu đề hoặc tác giả..."
              placeholder="Tìm theo tiêu đề hoặc tác giả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchPosts()}
            />
          </Col>
          <Col xs={6} md={3}>
            <Form.Select aria-label="Loại bài đăng" size="sm" className="rounded-3" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Tất cả bài viết & video nấu ăn</option>
              <option value="BLOG">Bài viết Blog chia sẻ</option>
              <option value="VIDEO">Video nấu ăn chay</option>
            </Form.Select>
          </Col>
          <Col xs={6} md={3}>
            <Form.Select aria-label="Trạng thái" size="sm" className="rounded-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="PUBLISHED">Đã phê duyệt / Xuất bản</option>
              <option value="PENDING_MODERATION">Chờ kiểm duyệt AI</option>
              <option value="HIDDEN_BY_AI">AI gắn cờ vi phạm (Chờ Admin duyệt)</option>
              <option value="DELETED">Đã xóa</option>
            </Form.Select>
          </Col>
          <Col xs={12} md={1}>
            <Button variant="success" size="sm" className="w-100 rounded-3" onClick={fetchPosts}>Lọc</Button>
          </Col>
        </Row>
      </div>

      {/* Danh sách */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="success" />
          <p className="mt-2 text-muted small">Đang nạp bài viết & video...</p>
        </div>
      ) : error ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center rounded-3">
          <span><i className="bi bi-exclamation-triangle me-2" />{error}</span>
          <Button variant="outline-danger" size="sm" onClick={fetchPosts}>Thử lại</Button>
        </Alert>
      ) : posts.length === 0 ? (
        <div className="text-center py-5 border rounded-4 bg-light">
          <i className="bi bi-file-earmark-x text-muted display-4" />
          <p className="mt-2 text-muted">Không có bài viết nào phù hợp điều kiện lọc</p>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <Table responsive hover className="mb-0 align-middle admin-table">
            <thead>
              <tr>
                <th className="stt-col">STT</th>
                <th>Tiêu đề & Tác giả</th>
                <th>Phân loại</th>
                <th>Trạng thái</th>
                <th>Phản hồi</th>
                <th className="text-end text-nowrap" style={{ width: 140, minWidth: 130 }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p, index) => {
                const title = p.blog?.title || p.video?.title || 'Không có tiêu đề';
                return (
                  <tr key={p.post_id}>
                    <td className="stt-col">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                    <td>
                      <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: 320 }}>{title}</div>
                      <div className="text-muted small">Tác giả: {p.author?.full_name}</div>
                    </td>
                    <td>
                      <span className={`cx-badge ${p.post_type === 'BLOG' ? 'cx-badge-info' : 'cx-badge-active'}`}>
                        {p.post_type === 'BLOG' ? 'Blog chia sẻ' : 'Video nấu ăn'}
                      </span>
                    </td>
                    <td>
                      <span className={`cx-badge ${
                        p.status === 'PUBLISHED' ? 'cx-badge-active' :
                        p.status === 'HIDDEN_BY_AI' ? 'cx-badge-locked' :
                        p.status === 'PENDING_MODERATION' ? 'cx-badge-info' : 'cx-badge-neutral'
                      }`}>
                        {p.status === 'PUBLISHED' ? 'Đã phê duyệt' :
                         p.status === 'HIDDEN_BY_AI' ? 'AI gắn cờ' :
                         p.status === 'PENDING_MODERATION' ? 'Chờ kiểm duyệt AI' :
                         p.status === 'DELETED' ? 'Đã xóa' : p.status}
                      </span>
                    </td>
                    <td className="small text-muted">{p._count.comments} bình luận · {p._count.reports} báo cáo</td>
                    <td className="text-end text-nowrap"><div className="d-inline-flex gap-1 justify-content-end align-items-center">
                      {p.status !== 'PUBLISHED' && (
                        <Button variant="outline-success" size="sm" className="me-1 rounded-3" onClick={() => handleUpdateStatus(p.post_id, 'PUBLISHED')} title="Duyệt xuất bản">
                          <i className="bi bi-check-lg" />
                        </Button>
                      )}
                      <Button variant="outline-primary" size="sm" className="me-1 rounded-3" onClick={() => handleStartEdit(p)} title="Chỉnh sửa nội dung vi phạm">
                        <i className="bi bi-pencil" />
                      </Button>
                      <Button variant="outline-danger" size="sm" className="rounded-3" onClick={() => handleDeletePost(p)} title={`Xóa vĩnh viễn ${p.post_type === 'BLOG' ? 'bài viết' : 'video'}`} aria-label={`Xóa vĩnh viễn ${p.post_type === 'BLOG' ? 'bài viết' : 'video'}: ${title}`}>
                        <i className="bi bi-trash" />
                      </Button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      {/* Modal Chỉnh sửa bài viết / video đồng bộ với người dùng */}
      {editingPost && (
        <PostComposer
          post={editingPost}
          user={user}
          categories={categories}
          onClose={() => setEditingPost(null)}
          onSaved={() => {
            setActionMsg(`Đã chỉnh sửa nội dung ${editingPost.post_type === 'BLOG' ? 'bài viết' : 'video'} thành công`);
            emitSyncEvent('POST_CHANGED', { postId: editingPost.post_id });
            setEditingPost(null);
            fetchPosts();
          }}
        />
      )}

      <AdminPagination {...pagination} />
    </div>
  );
}
