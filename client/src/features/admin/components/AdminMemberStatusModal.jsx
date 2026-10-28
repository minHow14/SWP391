// client/src/features/admin/components/AdminMemberStatusModal.jsx
import { Modal, Button } from 'react-bootstrap';

export default function AdminMemberStatusModal({
  confirmDelete,
  onHide,
  onConfirm,
}) {
  if (!confirmDelete) return null;

  return (
    <Modal show={!!confirmDelete} onHide={onHide} centered>
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title className="fs-6 fw-bold text-dark d-flex align-items-center gap-2">
          <i className="bi bi-person-x-fill text-danger" />
          Xác Nhận Xóa Tài Khoản
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="small text-muted mb-2">
          Bạn có chắc chắn muốn chuyển tài khoản thành viên sau sang trạng thái <strong>Đã xóa (DELETED)</strong>? Người dùng sẽ không thể tiếp tục đăng nhập hệ thống.
        </p>
        <div className="p-2 border rounded-3 bg-danger-subtle text-danger-emphasis small fw-medium text-truncate mb-2">
          Thành viên ID #{confirmDelete}
        </div>
      </Modal.Body>
      <Modal.Footer className="border-top">
        <Button variant="secondary" size="sm" className="rounded-3 px-3" onClick={onHide}>
          Hủy bỏ
        </Button>
        <Button variant="danger" size="sm" className="rounded-3 px-3 fw-medium" onClick={onConfirm}>
          Xác Nhận Xóa
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
