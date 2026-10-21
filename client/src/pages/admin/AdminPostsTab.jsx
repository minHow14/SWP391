// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminPostsTab.jsx
import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Form, Row, Col, Spinner, Alert, Modal } from 'react-bootstrap';
import { adminService } from '../../services/adminService.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../lib/syncEvents.js';

export default function AdminPostsTab() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [confirmDelete, setConfirmDelete] = useState(null); // { post, permanent: boolean }
  const [actionMsg, setActionMsg] = useState('');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getPosts({ postType: typeFilter, status: statusFilter, search, limit: 50 });
      setPosts(res.data);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách bài viết');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search]);

  useEffect(() => {
    fetchPosts();
  }, [typeFilter, statusFilter, fetchPosts]);

  // Tự động cập nhật danh sách bài viết khi có tác động từ các tab/trang khác
  useEffect(() => {
    const unsubscribe = subscribeSyncEvent(['POST_CHANGED', 'MODERATION_CHANGED', 'REPORT_CHANGED', 'CATEGORY_CHANGED', 'USER_CHANGED'], () => {
      fetchPosts();
    });
    return unsubscribe;
  }, [fetchPosts]);

  const handleUpdateStatus = async (postId, status) => {
    try {
      await adminService.updatePostStatus(postId, status);
      setActionMsg('Đã cập nhật trạng thái bài viết thành công');
      emitSyncEvent('POST_CHANGED', { postId, status });
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const { post, permanent } = confirmDelete;
    try {
      await adminService.deletePost(post.post_id, permanent);
      setActionMsg(
        permanent
          ? `Đã xóa vĩnh viễn bài viết "${post.blog?.title || post.video?.title || '#' + post.post_id}" thành công`
          : `Đã chuyển bài viết "${post.blog?.title || post.video?.title || '#' + post.post_id}" sang trạng thái Đã ẩn`
      );
      emitSyncEvent('POST_CHANGED', { postId: post.post_id });
      emitSyncEvent('COMMENT_CHANGED');
      setConfirmDelete(null);
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRestorePost = async (postId) => {
    try {
      await adminService.restorePost(postId);
      setActionMsg('Đã khôi phục bài viết hiển thị bình thường');
      emitSyncEvent('POST_CHANGED', { postId });
      emitSyncEvent('COMMENT_CHANGED');
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartEdit = (post) => {
    setEditingPost(post);
    setEditForm({
      title: post.blog?.title || post.video?.title || '',
      content: post.blog?.content || post.video?.transcript || '',
    });
  };

  const handleSaveEdit = async () => {
    try {
      await adminService.updatePost(editingPost.post_id, editForm);
      setActionMsg('Đã chỉnh sửa nội dung bài viết thành công');
      emitSyncEvent('POST_CHANGED', { postId: editingPost.post_id });
      setEditingPost(null);
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Quản Lý Bài Viết & Video Nấu Ăn</h4>
          <p className="text-muted small mb-0">Xem xét bài đăng cộng đồng, phê duyệt, chỉnh sửa từ ngữ vi phạm, ẩn hoặc xóa vĩnh viễn</p>
        </div>
      </div>

      {actionMsg && (
        <Alert variant="success" dismissible onClose={() => setActionMsg('')} className="cx-alert-banner py-2 px-3 mb-3">
          <i className="bi bi-check-circle-fill me-2 text-success" />{actionMsg}
        </Alert>
      )}

      {/* Bộ lọc cân đối */}
      <div className="admin-filter-bar mb-3">
        <Row className="g-2">
          <Col xs={12} md={4}>
            <div className="admin-search-wrapper">
              <i className="bi bi-search admin-search-icon" />
              <Form.Control
                size="sm"
                className="admin-search-input"
                placeholder="Tìm theo tiêu đề hoặc tác giả..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchPosts()}
              />
            </div>
          </Col>
          <Col xs={6} md={3}>
            <Form.Select size="sm" className="admin-select-input rounded-3" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Tất cả thể loại</option>
              <option value="BLOG">Bài viết Blog chia sẻ</option>
              <option value="VIDEO">Video nấu ăn chay</option>
            </Form.Select>
          </Col>
          <Col xs={6} md={3}>
            <Form.Select size="sm" className="admin-select-input rounded-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả bài viết</option>
              <option value="PUBLISHED">Đã phê duyệt</option>
              <option value="PENDING">Chờ phê duyệt</option>
              <option value="HIDDEN_BY_AI">AI đã ẩn do nghi vấn</option>
              <option value="HIDDEN">Đã ẩn</option>
              <option value="DELETED">Đã xóa vĩnh viễn (Lưu trữ DB)</option>
            </Form.Select>
          </Col>
          <Col xs={12} md={2}>
            <Button variant="success" size="sm" className="w-100 rounded-3 fw-medium" onClick={fetchPosts}>
              <i className="bi bi-funnel me-1" /> Lọc
            </Button>
          </Col>
        </Row>
      </div>

      {/* 4 Trạng thái UI */}
      {loading ? (
        <div className="admin-card p-4 text-center">
          <Spinner animation="border" variant="success" size="sm" className="me-2" />
          <span className="text-muted small">Đang tải danh sách bài viết...</span>
        </div>
      ) : error ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center rounded-3">
          <span><i className="bi bi-exclamation-triangle-fill me-2" />{error}</span>
          <Button variant="outline-danger" size="sm" className="rounded-3" onClick={fetchPosts}>Thử lại</Button>
        </Alert>
      ) : posts.length === 0 ? (
        <div className="cx-empty-state">
          <div className="cx-empty-icon">
            <i className="bi bi-file-earmark-x" />
          </div>
          <h5 className="fw-bold mb-1">Không có bài viết nào phù hợp</h5>
          <p className="text-muted small mb-3">Hãy thử xóa bộ lọc tìm kiếm hoặc thay đổi tiêu chí lựa chọn.</p>
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
                <th className="text-end pe-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p, index) => {
                const title = p.blog?.title || p.video?.title || 'Không có tiêu đề';
                const isHidden = p.status === 'HIDDEN' || p.status === 'DELETED';
                const isPermanentDeleted = p.status === 'DELETED';

                return (
                  <tr key={p.post_id} className={isHidden ? 'table-light opacity-75' : ''}>
                    <td className="stt-col">{index + 1}</td>
                    <td>
                      <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: 300 }}>{title}</div>
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
                        p.status === 'HIDDEN' ? 'cx-badge-locked' :
                        p.status === 'DELETED' ? 'cx-badge-neutral' : 'cx-badge-neutral'
                      }`}>
                        {p.status === 'PUBLISHED' ? 'Đã phê duyệt' : 
                         p.status === 'HIDDEN_BY_AI' ? 'AI đã ẩn' : 
                         p.status === 'HIDDEN' ? 'Đã ẩn' : 
                         p.status === 'DELETED' ? 'Đã xóa vĩnh viễn' : 'Chờ duyệt'}
                      </span>
                    </td>
                    <td className="small text-muted">
                      <span className="me-2"><i className="bi bi-chat me-1" />{p._count?.comments || 0}</span>
                      <span><i className="bi bi-flag me-1 text-danger" />{p._count?.reports || 0}</span>
                    </td>
                    <td className="text-end pe-3">
                      <div className="d-inline-flex gap-1">
                        {/* Khi bài viết đang ở trạng thái ĐÃ ẨN: Hiển thị 2 nút Khôi phục & Xóa vĩnh viễn */}
                        {p.status === 'HIDDEN' && (
                          <>
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="admin-action-btn"
                              onClick={() => handleRestorePost(p.post_id)}
                              title="Khôi phục hiển thị bài viết"
                            >
                              <i className="bi bi-arrow-counterclockwise" />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="admin-action-btn"
                              onClick={() => setConfirmDelete({ post: p, permanent: true })}
                              title="Xóa vĩnh viễn bài viết"
                            >
                              <i className="bi bi-trash3-fill" />
                            </Button>
                          </>
                        )}

                        {/* Khi bài viết đã xóa vĩnh viễn (lưu trữ DB): Vẫn cho phép khôi phục nếu cần */}
                        {isPermanentDeleted && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="admin-action-btn"
                            onClick={() => handleRestorePost(p.post_id)}
                            title="Khôi phục lại bài viết này"
                          >
                            <i className="bi bi-arrow-counterclockwise" />
                          </Button>
                        )}

                        {/* Khi bài viết đang hoạt động bình thường: Có nút Duyệt, Sửa, Ẩn */}
                        {!isHidden && (
                          <>
                            {p.status !== 'PUBLISHED' && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                className="admin-action-btn"
                                onClick={() => handleUpdateStatus(p.post_id, 'PUBLISHED')}
                                title="Duyệt xuất bản"
                              >
                                <i className="bi bi-check-lg" />
                              </Button>
                            )}
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="admin-action-btn"
                              onClick={() => handleStartEdit(p)}
                              title="Chỉnh sửa nội dung vi phạm"
                            >
                              <i className="bi bi-pencil" />
                            </Button>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="admin-action-btn"
                              onClick={() => setConfirmDelete({ post: p, permanent: false })}
                              title="Ẩn bài viết khỏi cộng đồng"
                            >
                              <i className="bi bi-eye-slash" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      {/* Modal Chỉnh sửa bài viết vi phạm */}
      <Modal show={!!editingPost} onHide={() => setEditingPost(null)} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fs-6 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="bi bi-pencil-square text-success" />
            Chỉnh sửa nội dung vi phạm tiêu chuẩn
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="editPostTitle">
            <Form.Label className="small fw-semibold">Tiêu đề bài viết / video</Form.Label>
            <Form.Control
              className="rounded-3"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="editPostContent">
            <Form.Label className="small fw-semibold">Nội dung chi tiết / Lời thuyết minh</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              className="rounded-3"
              value={editForm.content}
              onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-top">
          <Button variant="secondary" size="sm" className="rounded-3 px-3" onClick={() => setEditingPost(null)}>Đóng</Button>
          <Button variant="success" size="sm" className="rounded-3 px-3 fw-medium" onClick={handleSaveEdit}>Lưu cập nhật</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Xác nhận Ẩn hoặc Xóa vĩnh viễn */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fs-6 fw-bold text-dark d-flex align-items-center gap-2">
            <i className={`bi ${confirmDelete?.permanent ? 'bi-exclamation-octagon-fill text-danger' : 'bi-eye-slash text-warning'}`} />
            {confirmDelete?.permanent ? 'Xác Nhận Xóa Vĩnh Viễn' : 'Xác Nhận Ẩn Bài Viết'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {confirmDelete?.permanent ? (
            <div>
              <p className="small text-muted mb-2">
                Bạn có chắc chắn muốn <strong>xóa vĩnh viễn</strong> bài viết sau khỏi danh sách quản lý cộng đồng?
              </p>
              <div className="p-2 border rounded-3 bg-danger-subtle text-danger-emphasis small fw-medium text-truncate mb-2">
                {confirmDelete.post?.blog?.title || confirmDelete.post?.video?.title || '#' + confirmDelete.post?.post_id}
              </div>
            </div>
          ) : (
            <div>
              <p className="small text-muted mb-2">
                Bài viết sẽ chuyển sang trạng thái <strong>Đã ẩn</strong> và không còn hiển thị với cộng đồng:
              </p>
              <div className="p-2 border rounded-3 bg-light small fw-medium text-truncate mb-2">
                {confirmDelete?.post?.blog?.title || confirmDelete?.post?.video?.title || '#' + confirmDelete?.post?.post_id}
              </div>
              <p className="small text-muted mb-0">Bạn có thể khôi phục lại hiển thị bất kỳ lúc nào.</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-top">
          <Button variant="secondary" size="sm" className="rounded-3 px-3" onClick={() => setConfirmDelete(null)}>Hủy bỏ</Button>
          <Button
            variant={confirmDelete?.permanent ? 'danger' : 'warning'}
            size="sm"
            className="rounded-3 px-3 fw-medium"
            onClick={handleConfirmDelete}
          >
            {confirmDelete?.permanent ? 'Xác Nhận Xóa Vĩnh Viễn' : 'Đồng Ý Ẩn'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
