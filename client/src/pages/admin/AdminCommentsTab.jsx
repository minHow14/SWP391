// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminCommentsTab.jsx
import { useEffect, useState } from 'react';
import { Table, Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { adminService } from '../../services/adminService.js';

export default function AdminCommentsTab() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [flagFilter, setFlagFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchComments = async () => {
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
  };

  useEffect(() => {
    fetchComments();
  }, [statusFilter, flagFilter]);

  const handleUpdateStatus = async (commentId, status) => {
    try {
      await adminService.updateCommentStatus(commentId, status);
      setActionMsg(`Đã cập nhật trạng thái bình luận thành công`);
      fetchComments();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận vi phạm này?')) return;
    try {
      await adminService.deleteComment(commentId);
      setActionMsg('Đã xóa bình luận vi phạm');
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
          <p className="text-muted small mb-0">Theo dõi tương tác, kiểm tra bình luận nghi vấn vi phạm, ẩn hoặc gỡ bỏ</p>
        </div>
      </div>

      {actionMsg && (
        <Alert variant="success" dismissible onClose={() => setActionMsg('')} className="py-2 small rounded-3">
          <i className="bi bi-check-circle-fill me-2" />{actionMsg}
        </Alert>
      )}

      {/* Lọc & Tìm kiếm */}
      <div className="admin-card mb-3 p-3">
        <Row className="g-2">
          <Col xs={12} md={6}>
            <Form.Control
              size="sm"
              className="rounded-3"
              placeholder="Tìm kiếm nội dung bình luận..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchComments()}
            />
          </Col>
          <Col xs={6} md={3}>
            <Form.Select size="sm" className="rounded-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hiển thị</option>
              <option value="HIDDEN_BY_AI">AI đã ẩn do nghi vấn</option>
              <option value="DELETED">Đã xóa</option>
            </Form.Select>
          </Col>
          <Col xs={6} md={2}>
            <Form.Select size="sm" className="rounded-3" value={flagFilter} onChange={(e) => setFlagFilter(e.target.value)}>
              <option value="">Bộ lọc cờ AI</option>
              <option value="true">Có cờ nghi vấn</option>
              <option value="false">Bình thường</option>
            </Form.Select>
          </Col>
          <Col xs={12} md={1}>
            <Button variant="success" size="sm" className="w-100 rounded-3" onClick={fetchComments}>Lọc</Button>
          </Col>
        </Row>
      </div>

      {/* Danh sách bình luận */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="success" />
          <p className="mt-2 text-muted small">Đang nạp danh sách bình luận...</p>
        </div>
      ) : error ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center rounded-3">
          <span><i className="bi bi-exclamation-triangle me-2" />{error}</span>
          <Button variant="outline-danger" size="sm" onClick={fetchComments}>Thử lại</Button>
        </Alert>
      ) : comments.length === 0 ? (
        <div className="text-center py-5 border rounded-4 bg-light">
          <i className="bi bi-chat-left-text text-muted display-4" />
          <p className="mt-2 text-muted">Không tìm thấy bình luận nào phù hợp</p>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <Table responsive hover className="mb-0 align-middle admin-table">
            <thead>
              <tr>
                <th>Nội dung bình luận</th>
                <th>Người gửi</th>
                <th>Bài viết liên quan</th>
                <th>Cờ cảnh báo AI</th>
                <th>Trạng thái</th>
                <th className="text-end">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.comment_id}>
                  <td>
                    <div className="fw-semibold text-dark text-wrap" style={{ maxWidth: 320 }}>{c.content}</div>
                  </td>
                  <td className="small">{c.user?.full_name}</td>
                  <td className="small text-truncate" style={{ maxWidth: 200 }}>
                    {c.post?.blog?.title || c.post?.video?.title || 'Bài viết #' + c.post_id}
                  </td>
                  <td>
                    {c.is_flagged_by_ai ? (
                      <span className="cx-badge cx-badge-danger"><i className="bi bi-flag-fill me-1" />Có cờ nghi vấn</span>
                    ) : (
                      <span className="cx-badge cx-badge-neutral">Bình thường</span>
                    )}
                  </td>
                  <td>
                    <span className={`cx-badge ${
                      c.status === 'ACTIVE' ? 'cx-badge-active' :
                      c.status === 'HIDDEN_BY_AI' ? 'cx-badge-locked' : 'cx-badge-neutral'
                    }`}>
                      {c.status === 'ACTIVE' ? 'Đang hiển thị' : c.status === 'HIDDEN_BY_AI' ? 'AI đã ẩn' : 'Đã xóa'}
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
                      onClick={() => handleDeleteComment(c.comment_id)}
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
    </div>
  );
}
