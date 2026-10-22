// client/src/pages/admin/AdminCommentsTab.jsx
import { useEffect, useState, useCallback } from 'react';
import { Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { adminService } from '../../services/adminService.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../lib/syncEvents.js';
import AdminCommentTable from '../../features/admin/components/AdminCommentTable.jsx';
import AdminCommentDeleteModal from '../../features/admin/components/AdminCommentDeleteModal.jsx';

export default function AdminCommentsTab() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [flagFilter, setFlagFilter] = useState('');
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

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
  }, [statusFilter, flagFilter, fetchComments]);

  useEffect(() => {
    const unsubscribe = subscribeSyncEvent(
      ['COMMENT_CHANGED', 'POST_CHANGED', 'MODERATION_CHANGED', 'REPORT_CHANGED', 'USER_CHANGED'],
      () => {
        fetchComments();
      }
    );
    return unsubscribe;
  }, [fetchComments]);

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const { comment, permanent } = confirmDelete;
    try {
      await adminService.deleteComment(comment.comment_id, permanent);
      setActionMsg(
        permanent ? 'Đã xóa vĩnh viễn bình luận thành công' : 'Đã ẩn bình luận khỏi bài viết'
      );
      emitSyncEvent('COMMENT_CHANGED', { commentId: comment.comment_id });
      setConfirmDelete(null);
      fetchComments();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRestoreComment = async (commentId) => {
    try {
      await adminService.restoreComment(commentId);
      setActionMsg('Đã khôi phục bình luận hiển thị bình thường');
      emitSyncEvent('COMMENT_CHANGED', { commentId });
      fetchComments();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Quản Lý Bình Luận Cộng Đồng</h4>
          <p className="text-muted small mb-0">
            Theo dõi tương tác, kiểm tra bình luận nghi vấn vi phạm, ẩn hoặc xóa vĩnh viễn
          </p>
        </div>
      </div>

      {actionMsg && (
        <Alert variant="success" dismissible onClose={() => setActionMsg('')} className="cx-alert-banner py-2 px-3 mb-3">
          <i className="bi bi-check-circle-fill me-2 text-success" />
          {actionMsg}
        </Alert>
      )}

      {/* Lọc & Tìm kiếm */}
      <div className="admin-filter-bar mb-3">
        <Row className="g-2">
          <Col xs={12} md={4}>
            <div className="admin-search-wrapper">
              <i className="bi bi-search admin-search-icon" />
              <Form.Control
                size="sm"
                className="admin-search-input"
                placeholder="Tìm kiếm nội dung bình luận..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchComments()}
              />
            </div>
          </Col>
          <Col xs={6} md={3}>
            <Form.Select
              size="sm"
              className="admin-select-input rounded-3"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả bình luận</option>
              <option value="ACTIVE">Đang hiển thị</option>
              <option value="HIDDEN_BY_AI">Đã ẩn</option>
              <option value="HIDDEN">Đã ẩn</option>
              <option value="DELETED">Đã xóa vĩnh viễn (Lưu trữ DB)</option>
            </Form.Select>
          </Col>
          <Col xs={6} md={3}>
            <Form.Select
              size="sm"
              className="admin-select-input rounded-3"
              value={flagFilter}
              onChange={(e) => setFlagFilter(e.target.value)}
            >
              <option value="">Bộ lọc cờ AI</option>
              <option value="true">Có cờ nghi vấn</option>
              <option value="false">Bình thường</option>
            </Form.Select>
          </Col>
          <Col xs={12} md={2}>
            <Button variant="success" size="sm" className="w-100 rounded-3 fw-medium" onClick={fetchComments}>
              <i className="bi bi-funnel me-1" /> Lọc
            </Button>
          </Col>
        </Row>
      </div>

      {/* Danh sách bình luận */}
      {loading ? (
        <div className="admin-card p-4 text-center">
          <Spinner animation="border" variant="success" size="sm" className="me-2" />
          <span className="text-muted small">Đang nạp danh sách bình luận...</span>
        </div>
      ) : error ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center rounded-3">
          <span>
            <i className="bi bi-exclamation-triangle-fill me-2" />
            {error}
          </span>
          <Button variant="outline-danger" size="sm" className="rounded-3" onClick={fetchComments}>
            Thử lại
          </Button>
        </Alert>
      ) : comments.length === 0 ? (
        <div className="cx-empty-state">
          <div className="cx-empty-icon">
            <i className="bi bi-chat-left-text" />
          </div>
          <h5 className="fw-bold mb-1">Không tìm thấy bình luận nào</h5>
          <p className="text-muted small mb-3">Hãy thử thay đổi tiêu chí tìm kiếm hoặc kiểm tra lại bộ lọc.</p>
        </div>
      ) : (
        <AdminCommentTable
          comments={comments}
          onRestore={handleRestoreComment}
          onDeleteClick={setConfirmDelete}
        />
      )}

      {/* Modal Xác nhận Ẩn hoặc Xóa Bình luận */}
      <AdminCommentDeleteModal
        confirmDelete={confirmDelete}
        onHide={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
