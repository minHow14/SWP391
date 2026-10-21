// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminAiModerationTab.jsx
import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { adminService } from '../../services/adminService.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../lib/syncEvents.js';

export default function AdminAiModerationTab() {
  const [data, setData] = useState({ posts: [], comments: [], totalFlagged: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionItem, setActionItem] = useState(null);
  const [notes, setNotes] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchFlagged = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getAiFlaggedContent();
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Không thể tải nội dung AI gắn cờ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlagged();
  }, [fetchFlagged]);

  // Tự động cập nhật hàng đợi duyệt khi có thay đổi từ các tab khác
  useEffect(() => {
    const unsubscribe = subscribeSyncEvent(['MODERATION_CHANGED', 'POST_CHANGED', 'COMMENT_CHANGED'], () => {
      fetchFlagged();
    });
    return unsubscribe;
  }, [fetchFlagged]);

  const handleConfirmResolve = async () => {
    if (!actionItem) return;
    try {
      await adminService.resolveAiFlaggedItem({
        entityType: actionItem.type,
        entityId: actionItem.id,
        action: actionItem.action,
        notes,
      });
      setActionMsg(
        actionItem.action === 'APPROVE'
          ? 'Đã phê duyệt và khôi phục nội dung thành công'
          : 'Đã gỡ bỏ và xóa vĩnh viễn nội dung vi phạm khỏi cơ sở dữ liệu'
      );
      emitSyncEvent('MODERATION_CHANGED', { entityType: actionItem.type, entityId: actionItem.id, action: actionItem.action });
      emitSyncEvent(actionItem.type === 'POST' ? 'POST_CHANGED' : 'COMMENT_CHANGED', { id: actionItem.id });
      setActionItem(null);
      setNotes('');
      fetchFlagged();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Kiểm Duyệt Nội Dung AI Gắn Cờ Vi Phạm</h4>
          <p className="text-muted small mb-0">Xem xét và đưa ra quyết định cuối cùng đối với các nội dung tự động bị hệ thống AI gắn cờ</p>
        </div>
        <Button variant="outline-success" size="sm" className="rounded-3 px-3 fw-medium" onClick={fetchFlagged}>
          <i className="bi bi-arrow-clockwise me-1" /> Làm mới
        </Button>
      </div>

      {actionMsg && (
        <Alert variant="success" dismissible onClose={() => setActionMsg('')} className="cx-alert-banner py-2 px-3 mb-3">
          <i className="bi bi-check-circle-fill me-2 text-success" />{actionMsg}
        </Alert>
      )}

      {loading ? (
        <div className="admin-card p-4 text-center">
          <Spinner animation="border" variant="success" size="sm" className="me-2" />
          <span className="text-muted small">Đang quét các nội dung bị hệ thống AI gắn cờ...</span>
        </div>
      ) : error ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center rounded-3">
          <span><i className="bi bi-exclamation-triangle-fill me-2" />{error}</span>
          <Button variant="outline-danger" size="sm" className="rounded-3" onClick={fetchFlagged}>Thử lại</Button>
        </Alert>
      ) : data.totalFlagged === 0 ? (
        <div className="cx-empty-state">
          <div className="cx-empty-icon">
            <i className="bi bi-shield-check" />
          </div>
          <h5 className="fw-bold mb-1 text-dark">Hệ thống trong sạch, không có vi phạm tồn đọng</h5>
          <p className="text-muted small mb-0">Tất cả bài viết và bình luận đều đạt tiêu chuẩn cộng đồng hoặc đã hoàn tất quy trình kiểm duyệt.</p>
        </div>
      ) : (
        <>
          {/* Bài viết bị gắn cờ */}
          <div className="admin-card mb-4 overflow-hidden">
            <div className="admin-card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-danger d-flex align-items-center gap-2">
                <i className="bi bi-file-earmark-x fs-6" />
                Bài viết & Video bị AI gắn cờ ({data.posts.length})
              </h6>
            </div>
            <div className="p-0">
              {data.posts.length === 0 ? (
                <div className="p-3 text-muted small text-center">Không có bài viết nào đang bị gắn cờ.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle admin-table">
                  <thead>
                    <tr>
                      <th>Tiêu đề & Trích đoạn bài viết</th>
                      <th>Tác giả</th>
                      <th>Cảnh báo hệ thống</th>
                      <th className="text-end pe-3">Quyết định kiểm duyệt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.posts.map((p) => (
                      <tr key={p.post_id}>
                        <td>
                          <div className="fw-semibold text-dark">{p.blog?.title || p.video?.title}</div>
                          <div className="text-muted small text-truncate" style={{ maxWidth: 320 }}>
                            {p.blog?.content || p.video?.transcript}
                          </div>
                        </td>
                        <td className="small">{p.author?.full_name}</td>
                        <td><span className="cx-badge cx-badge-danger"><i className="bi bi-exclamation-circle me-1" />AI đã ẩn do nghi vấn</span></td>
                        <td className="text-end pe-3">
                          <Button variant="outline-success" size="sm" className="me-2 rounded-3 fw-medium" onClick={() => setActionItem({ type: 'POST', id: p.post_id, action: 'APPROVE', title: p.blog?.title || p.video?.title })}>
                            <i className="bi bi-check-circle me-1" /> Khôi phục
                          </Button>
                          <Button variant="outline-danger" size="sm" className="rounded-3 fw-medium" onClick={() => setActionItem({ type: 'POST', id: p.post_id, action: 'DELETE', title: p.blog?.title || p.video?.title })}>
                            <i className="bi bi-trash me-1" /> Xóa vĩnh viễn
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          </div>

          {/* Bình luận bị gắn cờ */}
          <div className="admin-card overflow-hidden">
            <div className="admin-card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-danger d-flex align-items-center gap-2">
                <i className="bi bi-chat-square-dots fs-6" />
                Bình luận bị AI gắn cờ ({data.comments.length})
              </h6>
            </div>
            <div className="p-0">
              {data.comments.length === 0 ? (
                <div className="p-3 text-muted small text-center">Không có bình luận nào đang bị gắn cờ.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle admin-table">
                  <thead>
                    <tr>
                      <th>Nội dung bình luận</th>
                      <th>Người bình luận</th>
                      <th>Bài viết liên quan</th>
                      <th className="text-end pe-3">Quyết định kiểm duyệt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.comments.map((c) => (
                      <tr key={c.comment_id}>
                        <td>
                          <div className="fw-semibold text-danger text-wrap" style={{ maxWidth: 280 }}>{c.content}</div>
                          <span className="cx-badge cx-badge-danger mt-1 d-inline-flex">Phát hiện từ khóa nghi vấn</span>
                        </td>
                        <td className="small">{c.user?.full_name}</td>
                        <td className="small text-truncate" style={{ maxWidth: 180 }}>{c.post?.blog?.title || c.post?.video?.title}</td>
                        <td className="text-end pe-3">
                          <Button variant="outline-success" size="sm" className="me-2 rounded-3 fw-medium" onClick={() => setActionItem({ type: 'COMMENT', id: c.comment_id, action: 'APPROVE', title: c.content })}>
                            <i className="bi bi-check-circle me-1" /> Bỏ cờ
                          </Button>
                          <Button variant="outline-danger" size="sm" className="rounded-3 fw-medium" onClick={() => setActionItem({ type: 'COMMENT', id: c.comment_id, action: 'DELETE', title: c.content })}>
                            <i className="bi bi-trash me-1" /> Xóa vĩnh viễn
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Xác nhận duyệt thủ công */}
      <Modal show={!!actionItem} onHide={() => setActionItem(null)} centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fs-6 fw-bold text-dark d-flex align-items-center gap-2">
            <i className={`bi ${actionItem?.action === 'APPROVE' ? 'bi-shield-check text-success' : 'bi-shield-slash-fill text-danger'}`} />
            {actionItem?.action === 'APPROVE' ? 'Xác Nhận Khôi Phục Nội Dung' : 'Xác Nhận Gỡ Bỏ Vĩnh Viễn'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {actionItem?.action === 'DELETE' ? (
            <div className="mb-3">
              <p className="text-danger fw-semibold mb-1">
                <i className="bi bi-exclamation-triangle-fill me-1" /> CẢNH BÁO QUAN TRỌNG:
              </p>
              <p className="small text-muted mb-2">
                Hành động này sẽ <strong>XÓA VĨNH VIỄN</strong> nội dung vi phạm này khỏi cơ sở dữ liệu ngay lập tức và không thể khôi phục.
              </p>
              <div className="p-2 border rounded-3 bg-danger-subtle text-danger-emphasis small fw-medium text-truncate">
                {actionItem?.title}
              </div>
            </div>
          ) : (
            <div className="mb-3">
              <p className="small text-muted mb-2">
                Nội dung sẽ được <strong>PHÊ DUYỆT VÀ KHÔI PHỤC</strong> về trạng thái hiển thị bình thường cho cộng đồng:
              </p>
              <div className="p-2 border rounded-3 bg-light small fw-medium text-truncate">
                {actionItem?.title}
              </div>
            </div>
          )}

          <Form.Group controlId="moderationNotesInput">
            <Form.Label className="small fw-semibold">Ghi chú xử lý của Quản trị viên:</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              className="rounded-3"
              placeholder="VD: Xác nhận nội dung vi phạm tiêu chuẩn cộng đồng, gỡ bỏ vĩnh viễn..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-top">
          <Button variant="secondary" size="sm" className="rounded-3 px-3" onClick={() => setActionItem(null)}>Hủy bỏ</Button>
          <Button variant={actionItem?.action === 'APPROVE' ? 'success' : 'danger'} size="sm" className="rounded-3 px-3 fw-medium" onClick={handleConfirmResolve}>
            {actionItem?.action === 'APPROVE' ? 'Phê Duyệt Khôi Phục' : 'Gỡ Bỏ & Xóa Vĩnh Viễn'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
