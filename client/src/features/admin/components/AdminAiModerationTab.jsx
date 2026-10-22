// client/src/features/admin/components/AdminAiModerationTab.jsx
import { useEffect, useState } from 'react';
import { Table, Button, Spinner, Alert } from 'react-bootstrap';
import { adminService } from '../../../services/adminService.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../../utils/syncEvents.js';
import AdminModerationActionModal from './AdminModerationActionModal.jsx';

export default function AdminAiModerationTab() {
  const [data, setData] = useState({ posts: [], comments: [], totalFlagged: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionItem, setActionItem] = useState(null);
  const [notes, setNotes] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchFlagged = async () => {
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
  };

  useEffect(() => {
    fetchFlagged();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeSyncEvent(['MODERATION_CHANGED', 'POST_CHANGED', 'COMMENT_CHANGED'], () => {
      fetchFlagged();
    });
    return unsubscribe;
  }, []);

  const handleConfirmResolve = async () => {
    if (!actionItem) return;
    try {
      await adminService.resolveAiFlaggedItem({
        entityType: actionItem.type,
        entityId: actionItem.id,
        action: actionItem.action,
        notes,
      });
      setActionMsg(`Đã ${actionItem.action === 'APPROVE' ? 'khôi phục' : 'gỡ bỏ'} nội dung vi phạm thành công`);
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Kiểm Duyệt Nội Dung AI Gắn Cờ Vi Phạm</h4>
          <p className="text-muted small mb-0">Xem xét và đưa ra quyết định cuối cùng đối với các nội dung tự động bị hệ thống AI gắn cờ</p>
        </div>
        <Button variant="outline-success" size="sm" className="rounded-3" onClick={fetchFlagged}>
          <i className="bi bi-arrow-clockwise me-1" /> Làm mới
        </Button>
      </div>

      {actionMsg && (
        <Alert variant="success" dismissible onClose={() => setActionMsg('')} className="py-2 small rounded-3">
          <i className="bi bi-check-circle-fill me-2" />{actionMsg}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="success" />
          <p className="mt-2 text-muted small">Đang quét các nội dung bị hệ thống AI gắn cờ...</p>
        </div>
      ) : error ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center rounded-3">
          <span><i className="bi bi-exclamation-triangle me-2" />{error}</span>
          <Button variant="outline-danger" size="sm" onClick={fetchFlagged}>Thử lại</Button>
        </Alert>
      ) : data.totalFlagged === 0 ? (
        <div className="text-center py-5 border rounded-4 bg-light">
          <i className="bi bi-shield-check text-success display-4" />
          <h5 className="mt-3 fw-bold text-dark">Hệ thống trong sạch, không có vi phạm tồn đọng</h5>
          <p className="text-muted small">Tất cả bài viết và bình luận đều đạt tiêu chuẩn cộng đồng hoặc đã hoàn tất quy trình kiểm duyệt.</p>
        </div>
      ) : (
        <>
          {/* Bài viết bị gắn cờ */}
          <div className="admin-card mb-4 overflow-hidden">
            <div className="admin-card-header bg-white py-3">
              <h6 className="fw-bold mb-0 text-danger">
                <i className="bi bi-file-earmark-x me-2" />
                Bài viết & Video bị AI gắn cờ ({data.posts.length})
              </h6>
            </div>
            <div className="p-0">
              {data.posts.length === 0 ? (
                <div className="p-3 text-muted small">Không có bài viết nào đang bị gắn cờ.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle admin-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 280 }}>Tiêu đề & Trích đoạn bài viết</th>
                      <th style={{ width: 150, minWidth: 130 }}>Tác giả</th>
                      <th style={{ width: 130, minWidth: 110 }}>Cảnh báo</th>
                      <th className="text-end text-nowrap" style={{ width: 270, minWidth: 260 }}>Quyết định kiểm duyệt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.posts.map((p) => (
                      <tr key={p.post_id}>
                        <td>
                          <div className="fw-semibold text-dark mb-1">{p.blog?.title || p.video?.title}</div>
                          <div className="text-muted small text-truncate" style={{ maxWidth: 350 }}>
                            {p.blog?.content || p.video?.transcript}
                          </div>
                        </td>
                        <td className="small text-nowrap fw-medium text-secondary">{p.author?.full_name || 'Ẩn danh'}</td>
                        <td><span className="cx-badge cx-badge-danger">Đã ẩn</span></td>
                        <td className="text-end text-nowrap">
                          <div className="d-inline-flex gap-2 justify-content-end align-items-center">
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="rounded-3 px-2 py-1 text-nowrap d-inline-flex align-items-center gap-1"
                              onClick={() => setActionItem({ type: 'POST', id: p.post_id, action: 'APPROVE', title: p.blog?.title || p.video?.title })}
                            >
                              <i className="bi bi-check-circle" /> Phê duyệt khôi phục
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="rounded-3 px-2 py-1 text-nowrap d-inline-flex align-items-center gap-1"
                              onClick={() => setActionItem({ type: 'POST', id: p.post_id, action: 'DELETE', title: p.blog?.title || p.video?.title })}
                            >
                              <i className="bi bi-trash" /> Xóa vĩnh viễn
                            </Button>
                          </div>
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
            <div className="admin-card-header bg-white py-3">
              <h6 className="fw-bold mb-0 text-danger">
                <i className="bi bi-chat-square-dots me-2" />
                Bình luận bị AI gắn cờ ({data.comments.length})
              </h6>
            </div>
            <div className="p-0">
              {data.comments.length === 0 ? (
                <div className="p-3 text-muted small">Không có bình luận nào đang bị gắn cờ.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle admin-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 320 }}>Nội dung bình luận</th>
                      <th style={{ width: 160, minWidth: 140 }}>Người bình luận</th>
                      <th style={{ width: 240, minWidth: 180 }}>Bài viết liên quan</th>
                      <th className="text-end text-nowrap" style={{ width: 220, minWidth: 220 }}>Quyết định kiểm duyệt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.comments.map((c) => (
                      <tr key={c.comment_id}>
                        <td>
                          <div className="fw-medium text-dark mb-1">{c.content}</div>
                          <span className="cx-badge cx-badge-danger d-inline-block">
                            <i className="bi bi-exclamation-triangle-fill me-1" />
                            Phát hiện từ khóa nghi vấn
                          </span>
                        </td>
                        <td className="small text-nowrap fw-medium text-secondary">{c.user?.full_name || 'Khách / Ẩn danh'}</td>
                        <td className="small">
                          <span className="d-inline-block text-truncate" style={{ maxWidth: 220 }} title={c.post?.blog?.title || c.post?.video?.title}>
                            {c.post?.blog?.title || c.post?.video?.title || 'Không có tiêu đề'}
                          </span>
                        </td>
                        <td className="text-end text-nowrap">
                          <div className="d-inline-flex gap-2 justify-content-end align-items-center">
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="rounded-3 px-2 py-1 text-nowrap d-inline-flex align-items-center gap-1"
                              onClick={() => setActionItem({ type: 'COMMENT', id: c.comment_id, action: 'APPROVE', title: c.content })}
                            >
                              <i className="bi bi-check-circle" /> Bỏ gắn cờ
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="rounded-3 px-2 py-1 text-nowrap d-inline-flex align-items-center gap-1"
                              onClick={() => setActionItem({ type: 'COMMENT', id: c.comment_id, action: 'DELETE', title: c.content })}
                            >
                              <i className="bi bi-trash" /> Xóa bỏ
                            </Button>
                          </div>
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
      <AdminModerationActionModal
        actionItem={actionItem}
        notes={notes}
        setNotes={setNotes}
        onClose={() => setActionItem(null)}
        onConfirm={handleConfirmResolve}
      />
    </div>
  );
}
