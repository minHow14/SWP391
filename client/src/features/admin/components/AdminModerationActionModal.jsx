// client/src/features/admin/components/AdminModerationActionModal.jsx
import { Modal, Button, Form } from 'react-bootstrap';

export default function AdminModerationActionModal({
  actionItem,
  notes,
  setNotes,
  onClose,
  onConfirm,
}) {
  if (!actionItem) return null;
  const isApprove = actionItem.action === 'APPROVE';

  return (
    <Modal show={!!actionItem} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 fw-bold">
          {isApprove ? 'Xác Nhận Khôi Phục Nội Dung' : 'Xác Nhận Gỡ Bỏ Vi Phạm'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="small mb-2">
          Hành động: <strong>{isApprove ? 'PHÊ DUYỆT KHÔI PHỤC' : 'GỠ BỎ VĨNH VIỄN'}</strong> cho:
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
            className="rounded-3"
            placeholder="VD: Đã rà soát thực tế không có dấu hiệu quảng cáo hay vi phạm..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" className="rounded-3" onClick={onClose}>
          Hủy bỏ
        </Button>
        <Button
          variant={isApprove ? 'success' : 'danger'}
          size="sm"
          className="rounded-3"
          onClick={onConfirm}
        >
          Xác nhận thực hiện
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
