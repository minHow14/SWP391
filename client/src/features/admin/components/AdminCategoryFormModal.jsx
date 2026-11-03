// D:/SWP391/SWP391/client/src/features/admin/components/AdminCategoryFormModal.jsx
import { Modal, Form, Button } from 'react-bootstrap';

export default function AdminCategoryFormModal({
  show,
  onHide,
  modalMode,
  categoryName,
  setCategoryName,
  onSubmit,
}) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={onSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">
            {modalMode === 'CREATE' ? 'Thêm Danh Mục Mới' : 'Cập Nhật Tên Danh Mục'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="categoryNameInput">
            <Form.Label className="small fw-semibold">
              Tên danh mục
            </Form.Label>
            <Form.Control
              autoFocus
              className="rounded-3"
              placeholder="Nhập tên danh mục"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" className="rounded-3" onClick={onHide}>
            Hủy
          </Button>
          <Button variant="success" size="sm" className="rounded-3" type="submit">
            {modalMode === 'CREATE' ? 'Tạo danh mục' : 'Lưu thay đổi'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
