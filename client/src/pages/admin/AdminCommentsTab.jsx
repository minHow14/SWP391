// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminCommentsTab.jsx
import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Form, Row, Col, Spinner, Alert, Modal } from 'react-bootstrap';
import { adminService } from '../../services/adminService.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../lib/syncEvents.js';

export default function AdminCommentsTab() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [flagFilter, setFlagFilter] = useState('');
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // { comment, permanent: boolean }
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

  // Tự động cập nhật danh sách bình luận khi có tác động từ các tab/trang khác
  useEffect(() => {
    const unsubscribe = subscribeSyncEvent(['COMMENT_CHANGED', 'POST_CHANGED', 'MODERATION_CHANGED', 'REPORT_CHANGED', 'USER_CHANGED'], () => {
      fetchComments();
    });
    return unsubscribe;
  }, [fetchComments]);

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const { comment, permanent } = confirmDelete;
    try {
      await adminService.deleteComment(comment.comment_id, permanent);
      setActionMsg(
        permanent
          ? 'Đã xóa vĩnh viễn bình luận thành công'
          : 'Đã ẩn bình luận khỏi bài viết'
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
          <p className="text-muted small mb-0">Theo dõi tương tác, kiểm tra bình luận nghi vấn vi phạm, ẩn hoặc xóa vĩnh viễn</p>
        </div>
      </div>

      {actionMsg && (
        <Alert variant="success" dismissible onClose={() => setActionMsg('')} className="cx-alert-banner py-2 px-3 mb-3">
          <i className="bi bi-check-circle-fill me-2 text-success" />{actionMsg}
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
            <Form.Select size="sm" className="admin-select-input rounded-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả bình luận</option>
              <option value="ACTIVE">Đang hiển thị</option>
              <option value="HIDDEN_BY_AI">AI đã ẩn do nghi vấn</option>
              <option value="HIDDEN">Đã ẩn</option>
              <option value="DELETED">Đã xóa vĩnh viễn (Lưu trữ DB)</option>
            </Form.Select>
          </Col>
          <Col xs={6} md={3}>
            <Form.Select size="sm" className="admin-select-input rounded-3" value={flagFilter} onChange={(e) => setFlagFilter(e.target.value)}>
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
          <span><i className="bi bi-exclamation-triangle-fill me-2" />{error}</span>
          <Button variant="outline-danger" size="sm" className="rounded-3" onClick={fetchComments}>Thử lại</Button>
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
        <div className="admin-card overflow-hidden">
          <Table responsive hover className="mb-0 align-middle admin-table">
            <thead>
              <tr>
                <th>Nội dung bình luận</th>
                <th>Người đăng</th>
                <th>Bài viết liên kết</th>
                <th>Cờ cảnh báo AI</th>
                <th>Trạng thái</th>
                <th className="text-end pe-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => {
                const isHidden = c.status === 'HIDDEN' || c.status === 'DELETED';
                const isPermanentDeleted = c.status === 'DELETED';

                return (
                  <tr key={c.comment_id} className={isHidden ? 'table-light opacity-75' : ''}>
                    <td>
                      <div className="fw-semibold text-dark text-wrap" style={{ maxWidth: 280 }}>
                        <i className="bi bi-chat-quote me-1 text-muted" />
                        {c.content}
                      </div>
                    </td>
                    <td className="small">
                      <div className="fw-semibold">{c.user?.full_name}</div>
                    </td>
                    <td className="small text-truncate" style={{ maxWidth: 180 }}>
                      <span className="text-muted">{c.post?.blog?.title || c.post?.video?.title || 'Bài viết #' + c.post_id}</span>
                    </td>
                    <td>
                      {c.is_flagged_by_ai ? (
                        <span className="cx-badge cx-badge-danger">
                          <i className="bi bi-flag-fill me-1" /> Có cờ nghi vấn
                        </span>
                      ) : (
                        <span className="cx-badge cx-badge-neutral">Bình thường</span>
                      )}
                    </td>
                    <td>
                      <span className={`cx-badge ${
                        c.status === 'ACTIVE' ? 'cx-badge-active' :
                        c.status === 'HIDDEN_BY_AI' ? 'cx-badge-locked' :
                        c.status === 'HIDDEN' ? 'cx-badge-locked' :
                        c.status === 'DELETED' ? 'cx-badge-neutral' : 'cx-badge-neutral'
                      }`}>
                        {c.status === 'ACTIVE' ? 'Đang hiển thị' : 
                         c.status === 'HIDDEN_BY_AI' ? 'AI đã ẩn' : 
                         c.status === 'HIDDEN' ? 'Đã ẩn' : 
                         c.status === 'DELETED' ? 'Đã xóa vĩnh viễn' : 'Đã ẩn'}
                      </span>
                    </td>
                    <td className="text-end pe-3">
                      <div className="d-inline-flex gap-1">
                        {/* Khi bình luận đang ở trạng thái ĐÃ ẨN */}
                        {c.status === 'HIDDEN' && (
                          <>
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="admin-action-btn"
                              onClick={() => handleRestoreComment(c.comment_id)}
                              title="Khôi phục hiển thị bình luận"
                            >
                              <i className="bi bi-arrow-counterclockwise" />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="admin-action-btn"
                              onClick={() => setConfirmDelete({ comment: c, permanent: true })}
                              title="Xóa vĩnh viễn bình luận"
                            >
                              <i className="bi bi-trash3-fill" />
                            </Button>
                          </>
                        )}

                        {/* Khi bình luận đã xóa vĩnh viễn (lưu trữ DB): Vẫn cho phép khôi phục */}
                        {isPermanentDeleted && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="admin-action-btn"
                            onClick={() => handleRestoreComment(c.comment_id)}
                            title="Khôi phục lại bình luận này"
                          >
                            <i className="bi bi-arrow-counterclockwise" />
                          </Button>
                        )}

                        {/* Khi bình luận đang hiển thị bình thường: Có nút Ẩn */}
                        {!isHidden && (
                          <Button
                            variant="outline-warning"
                            size="sm"
                            className="admin-action-btn"
                            onClick={() => setConfirmDelete({ comment: c, permanent: false })}
                            title="Ẩn bình luận khỏi bài viết"
                          >
                            <i className="bi bi-eye-slash" />
                          </Button>
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

      {/* Modal Xác nhận Ẩn hoặc Xóa Bình luận */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fs-6 fw-bold text-dark d-flex align-items-center gap-2">
            <i className={`bi ${confirmDelete?.permanent ? 'bi-exclamation-octagon-fill text-danger' : 'bi-eye-slash text-warning'}`} />
            {confirmDelete?.permanent ? 'Xác Nhận Xóa Vĩnh Viễn' : 'Xác Nhận Ẩn Bình Luận'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {confirmDelete?.permanent ? (
            <div>
              <p className="small text-muted mb-2">
                Bạn có chắc chắn muốn <strong>xóa vĩnh viễn</strong> bình luận sau khỏi danh sách hiển thị của hệ thống?
              </p>
              <div className="p-2 border rounded-3 bg-danger-subtle text-danger-emphasis small fw-medium text-truncate mb-2">
                "{confirmDelete?.comment?.content}"
              </div>
            </div>
          ) : (
            <div>
              <p className="small text-muted mb-2">
                Bình luận sẽ chuyển sang trạng thái <strong>Đã ẩn</strong> và không còn hiển thị với cộng đồng:
              </p>
              <div className="p-2 border rounded-3 bg-light small fw-medium text-truncate mb-2">
                "{confirmDelete?.comment?.content}"
              </div>
              <p className="small text-muted mb-0">Bạn có thể khôi phục lại bình luận này bất cứ khi nào cần.</p>
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
