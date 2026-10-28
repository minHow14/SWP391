// client/src/features/admin/components/AdminPostDeleteModal.jsx
import { Modal, Button } from 'react-bootstrap';

export default function AdminPostDeleteModal({
  confirmDelete,
  onHide,
  onConfirm,
}) {
  if (!confirmDelete) return null;

  const { post, postTitle, contentType } = confirmDelete;

  return (
    <Modal show={!!confirmDelete} onHide={onHide} centered>
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title className="fs-6 fw-bold text-dark d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-octagon-fill text-danger" />
          Xác Nhận Xóa Vĩnh Viễn
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="small text-muted mb-2">
          Bạn có chắc chắn muốn <strong>xóa vĩnh viễn</strong> {contentType} sau khỏi hệ thống? Hành động này không thể hoàn tác.
        </p>
        <div className="p-2 border rounded-3 bg-danger-subtle text-danger-emphasis small fw-medium text-truncate mb-2">
          "{postTitle}" (ID #{post?.post_id})
        </div>
      </Modal.Body>
      <Modal.Footer className="border-top">
        <Button variant="secondary" size="sm" className="rounded-3 px-3" onClick={onHide}>
          Hủy bỏ
        </Button>
        <Button variant="danger" size="sm" className="rounded-3 px-3 fw-medium" onClick={onConfirm}>
          Xác Nhận Xóa Vĩnh Viễn
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
