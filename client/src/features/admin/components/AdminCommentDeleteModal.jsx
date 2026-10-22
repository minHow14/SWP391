// client/src/features/admin/components/AdminCommentDeleteModal.jsx
import { Modal, Button } from 'react-bootstrap';

export default function AdminCommentDeleteModal({ confirmDelete, onHide, onConfirm }) {
  if (!confirmDelete) return null;

  const isPermanent = confirmDelete.permanent;

  return (
    <Modal show={!!confirmDelete} onHide={onHide} centered>
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title className="fs-6 fw-bold text-dark d-flex align-items-center gap-2">
          <i
            className={`bi ${
              isPermanent ? 'bi-exclamation-octagon-fill text-danger' : 'bi-eye-slash text-warning'
            }`}
          />
          {isPermanent ? 'Xác Nhận Xóa Vĩnh Viễn' : 'Xác Nhận Ẩn Bình Luận'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isPermanent ? (
          <div>
            <p className="small text-muted mb-2">
              Bạn có chắc chắn muốn <strong>xóa vĩnh viễn</strong> bình luận sau khỏi danh sách hiển thị của hệ thống?
            </p>
            <div className="p-2 border rounded-3 bg-danger-subtle text-danger-emphasis small fw-medium text-truncate mb-2">
              "{confirmDelete.comment?.content}"
            </div>
          </div>
        ) : (
          <div>
            <p className="small text-muted mb-2">
              Bình luận sẽ chuyển sang trạng thái <strong>Đã ẩn</strong> và không còn hiển thị với cộng đồng:
            </p>
            <div className="p-2 border rounded-3 bg-light small fw-medium text-truncate mb-2">
              "{confirmDelete.comment?.content}"
            </div>
            <p className="small text-muted mb-0">Bạn có thể khôi phục lại bình luận này bất cứ khi nào cần.</p>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="border-top">
        <Button variant="secondary" size="sm" className="rounded-3 px-3" onClick={onHide}>
          Hủy bỏ
        </Button>
        <Button
          variant={isPermanent ? 'danger' : 'warning'}
          size="sm"
          className="rounded-3 px-3 fw-medium"
          onClick={onConfirm}
        >
          {isPermanent ? 'Xác Nhận Xóa Vĩnh Viễn' : 'Đồng Ý Ẩn'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
