// client/src/features/admin/components/AdminCommentsTab.jsx
import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { adminService } from '../../../services/adminService.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../../utils/syncEvents.js';
import AdminCommentDeleteModal from './AdminCommentDeleteModal.jsx';

export default function AdminCommentsTab() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [flagFilter, setFlagFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [deletingComment, setDeletingComment] = useState(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getComments({
        status: statusFilter,
        isFlagged: flagFilter,
        search,
        limit: 50,
      });
      setComments(res.data);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách bình luận');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, flagFilter, search]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Tự động cập nhật danh sách bình luận khi có tác động từ các tab/trang khác
  useEffect(() => {
    const unsubscribe = subscribeSyncEvent(
      ['COMMENT_CHANGED', 'POST_CHANGED', 'MODERATION_CHANGED', 'REPORT_CHANGED', 'USER_CHANGED'],
      () => {
        fetchComments();
      }
    );
    return unsubscribe;
  }, [fetchComments]);

  const handleUpdateStatus = async (commentId, status) => {
    try {
      await adminService.updateCommentStatus(commentId, status);
      setActionMsg(`Đã cập nhật trạng thái bình luận thành công`);
      emitSyncEvent('COMMENT_CHANGED', { commentId, status });
      fetchComments();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingComment?.comment?.comment_id) return;
    const commentId = deletingComment.comment.comment_id;
    try {
      await adminService.deleteComment(commentId);
      setActionMsg('Đã xóa bình luận vi phạm');
      emitSyncEvent('COMMENT_CHANGED', { commentId });
      setDeletingComment(null);
      fetchComments();
    } catch (err) {
      setError(err.message);
      setDeletingComment(null);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-bold mb-1">Kiểm Duyệt & Quản Lý Bình Luận</h5>
          <p className="text-muted small mb-0">Quản trị nội dung tương tác của người dùng trên toàn hệ thống</p>
        </div>
        <Button variant="outline-success" size="sm" onClick={fetchComments} disabled={loading} className="rounded-3">
          <i className="bi bi-arrow-clockwise me-1" /> Làm mới
        </Button>
      </div>

      {actionMsg && (
        <Alert variant="success" dismissible onClose={() => setActionMsg('')} className="py-2 small rounded-3">
          {actionMsg}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="py-2 small rounded-3">
          {error}
        </Alert>
      )}

      {/* Bộ lọc bình luận */}
      <div className="admin-filter-bar mb-3">
        <Row className="g-2">
          <Col xs={12} md={4}>
            <Form.Control
              type="text"
              size="sm"
              placeholder="Tìm theo nội dung hoặc người đăng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-3"
            />
          </Col>
          <Col xs={6} md={3}>
            <Form.Select
              size="sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-3"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hiển thị</option>
              <option value="HIDDEN_BY_AI">Đã ẩn (Nghi vi phạm)</option>
              <option value="DELETED">Đã xóa</option>
            </Form.Select>
          </Col>
          <Col xs={6} md={3}>
            <Form.Select
              size="sm"
              value={flagFilter}
              onChange={(e) => setFlagFilter(e.target.value)}
              className="rounded-3"
            >
              <option value="">Cờ kiểm duyệt</option>
              <option value="true">Bị gắn cờ vi phạm</option>
              <option value="false">Bình thường</option>
            </Form.Select>
          </Col>
        </Row>
      </div>

      {/* Bảng danh sách bình luận */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="success" size="sm" />
          <p className="mt-2 text-muted small">Đang nạp danh sách bình luận...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="admin-empty-state">
          <i className="bi bi-chat-square-text text-muted display-6 mb-2" />
          <p className="text-muted small">Không tìm thấy bình luận nào phù hợp với bộ lọc.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <Table hover className="admin-table align-middle">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Người gửi</th>
                <th>Nội dung bình luận</th>
                <th>Vị trí</th>
                <th style={{ width: '130px' }}>Trạng thái</th>
                <th style={{ width: '120px' }} className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.comment_id}>
                  <td className="text-muted small">#{c.comment_id}</td>
                  <td>
                    <div className="fw-medium small">{c.user?.full_name || 'Vô danh'}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{c.user?.email}</div>
                  </td>
                  <td>
                    <div className="small text-break" style={{ maxWidth: '350px' }}>
                      {c.content}
                    </div>
                    {c.is_flagged && (
                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle mt-1" style={{ fontSize: '0.7rem' }}>
                        <i className="bi bi-flag-fill me-1" />Bị gắn cờ vi phạm
                      </span>
                    )}
                  </td>
                  <td className="small text-muted">
                    {c.post_id ? (
                      <span className="badge bg-light text-dark border">
                        Bài viết #{c.post_id}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>
                    <span className={`cx-badge-status ${
                      c.status === 'ACTIVE' ? 'cx-badge-active' :
                      c.status === 'HIDDEN_BY_AI' ? 'cx-badge-locked' : 'cx-badge-neutral'
                    }`}>
                      {c.status === 'ACTIVE' ? 'Đang hiển thị' : c.status === 'HIDDEN_BY_AI' ? 'Đã ẩn' : 'Đã xóa'}
                    </span>
                  </td>
                  <td className="text-end">
                    {c.status !== 'ACTIVE' && (
                      <Button
                        variant="outline-success"
                        size="sm"
                        className="me-1 rounded-3"
                        onClick={() => handleUpdateStatus(c.comment_id, 'ACTIVE')}
                        title="Khôi phục hiển thị bình luận"
                      >
                        <i className="bi bi-eye" />
                      </Button>
                    )}
                    {c.status === 'ACTIVE' && (
                      <Button
                        variant="outline-warning"
                        size="sm"
                        className="me-1 rounded-3"
                        onClick={() => handleUpdateStatus(c.comment_id, 'HIDDEN_BY_AI')}
                        title="Ẩn bình luận"
                      >
                        <i className="bi bi-eye-slash" />
                      </Button>
                    )}
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="rounded-3"
                      onClick={() => setDeletingComment({ comment: c, permanent: true })}
                      disabled={c.status === 'DELETED'}
                      title="Xóa bình luận vi phạm"
                    >
                      <i className="bi bi-trash" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <AdminCommentDeleteModal
        confirmDelete={deletingComment}
        onHide={() => setDeletingComment(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
