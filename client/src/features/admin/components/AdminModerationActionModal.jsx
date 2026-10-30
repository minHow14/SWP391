// D:/SWP391/SWP391/client/src/features/admin/components/AdminModerationActionModal.jsx
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';

export default function AdminModerationActionModal({
  actionItem,
  notes,
  setNotes,
  onClose,
  onConfirm,
  submitting = false,
  error = '',
}) {
  if (!actionItem) return null;
  const isApprove = actionItem.action === 'APPROVE';

  return (
    <Modal show={!!actionItem} onHide={submitting ? undefined : onClose} centered>
      <Modal.Header closeButton={!submitting}>
        <Modal.Title className="fs-5 fw-bold">
          {isApprove ? 'Xác nhận cho phép hiển thị' : 'Xác nhận gỡ nội dung'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="py-2 small rounded-3 mb-3">
            <i className="bi bi-exclamation-triangle me-2" />
            {error}
          </Alert>
        )}
        <p className="small mb-2">
          Hành động: <strong>{isApprove ? 'CHO PHÉP HIỂN THỊ' : 'GỠ NỘI DUNG'}</strong> cho:
        </p>
        <div className="p-2 border rounded-3 bg-light small mb-3 text-truncate">
          {actionItem.title}
        </div>
        <Form.Group controlId="moderationNotesInput">
          <Form.Label className="small fw-semibold">
            Ghi chú xử lý của Quản trị viên (lưu vào nhật ký hệ thống):
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            maxLength={500}
            className="rounded-3"
            placeholder="VD: Đã rà soát thực tế không có dấu hiệu quảng cáo hay vi phạm..."
            value={notes}
            disabled={submitting}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" className="rounded-3" onClick={onClose} disabled={submitting}>
          Hủy bỏ
        </Button>
        <Button
          variant={isApprove ? 'success' : 'danger'}
          size="sm"
          className="rounded-3"
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1" />
              Đang xử lý...
            </>
          ) : (
            'Xác nhận thực hiện'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
