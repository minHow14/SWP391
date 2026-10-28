// D:/SWP391/SWP391/client/src/features/admin/components/AdminAiModerationTab.jsx
import { useState } from 'react';
import { Alert, Button, Spinner } from 'react-bootstrap';
import { adminService } from '../../../services/adminService.js';
import { emitSyncEvent } from '../../../utils/syncEvents.js';
import { useAiModeration } from '../hooks/useAiModeration.js';
import AdminAiModerationTable from './AdminAiModerationTable.jsx';
import AdminModerationActionModal from './AdminModerationActionModal.jsx';

export default function AdminAiModerationTab() {
  const { data, loading, error, refresh } = useAiModeration();
  const [actionItem, setActionItem] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const openAction = (item) => { setNotes(''); setActionError(''); setActionItem(item); };
  const closeAction = () => { if (!submitting) { setActionItem(null); setActionError(''); } };

  async function confirmAction() {
    if (!actionItem || submitting) return;
    setSubmitting(true); setActionError('');
    try {
      await adminService.resolveAiFlaggedItem({ entityType: actionItem.type, entityId: actionItem.id,
        action: actionItem.action, contentVersion: actionItem.contentVersion, notes });
      setMessage(actionItem.action === 'APPROVE' ? 'Đã cho phép hiển thị nội dung.' : 'Đã gỡ nội dung.');
      setActionItem(null);
      emitSyncEvent('MODERATION_CHANGED');
      refresh();
    } catch (failure) { setActionError(failure.message || 'Không thể xử lý nội dung.'); refresh(); }
    finally { setSubmitting(false); }
  }

  return (
    <section aria-label="Kiểm duyệt nội dung">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
        <div><h4 className="fw-bold mb-1">Kiểm duyệt nội dung</h4>
          <p className="text-secondary small mb-0">Xem nội dung AI đề nghị kiểm tra, đang chờ quét hoặc chưa kiểm tra thành công. Admin đưa ra quyết định cuối cùng.</p></div>
        <Button variant="outline-success" onClick={refresh}>Làm mới</Button>
      </div>
      {message && <Alert variant="success" dismissible onClose={() => setMessage('')} role="status">{message}</Alert>}
      {loading ? <p role="status"><Spinner as="span" animation="border" size="sm" className="me-2" />Đang tải hàng chờ kiểm duyệt…</p> :
        error ? <Alert variant="danger">{error}<Button variant="outline-danger" className="ms-2" onClick={refresh}>Thử lại</Button></Alert> :
          data.totalFlagged === 0 ? <Alert variant="light" className="border">
            <h5 className="h6">Không có nội dung đang chờ xử lý</h5>
            <p className="mb-0 small">Hàng chờ hiện đang trống. Điều này không có nghĩa toàn bộ nội dung cũ đã được AI kiểm tra.</p>
          </Alert> : <>
            <AdminAiModerationTable items={data.posts} entityType="POST" onAction={openAction} />
            <AdminAiModerationTable items={data.comments} entityType="COMMENT" onAction={openAction} />
          </>}
      <AdminModerationActionModal actionItem={actionItem} notes={notes} setNotes={setNotes}
        onClose={closeAction} onConfirm={confirmAction} submitting={submitting} error={actionError} />
    </section>
  );
}
