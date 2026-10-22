// client/src/features/admin/components/AdminCategoryFormModal.jsx
import { Modal, Form, Button } from 'react-bootstrap';

export default function AdminCategoryFormModal({
  show,
  onHide,
  modalMode,
  targetType,
  setTargetType,
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
          <Form.Group className="mb-3" controlId="categoryScopeChoice">
            <Form.Label className="small fw-semibold text-muted">Nhóm phân loại:</Form.Label>
            <div className="d-flex gap-2">
              <Button
                type="button"
                variant={targetType === 'RECIPE' ? 'success' : 'outline-secondary'}
                size="sm"
                className="rounded-3"
                onClick={() => setTargetType('RECIPE')}
              >
                <i className="bi bi-book-half me-1" /> Món Ăn & Công Thức
              </Button>
              <Button
                type="button"
                variant={targetType === 'BLOG' ? 'primary' : 'outline-secondary'}
                size="sm"
                className="rounded-3"
                onClick={() => setTargetType('BLOG')}
              >
                <i className="bi bi-journal-richtext me-1" /> Blog (Bài Viết)
              </Button>
            </div>
          </Form.Group>

          <Form.Group controlId="categoryNameInput">
            <Form.Label className="small fw-semibold">
              Tên danh mục {targetType === 'RECIPE' ? 'món ăn & công thức' : 'bài viết blog'}
            </Form.Label>
            <Form.Control
              autoFocus
              className="rounded-3"
              placeholder={
                targetType === 'RECIPE'
                  ? 'VD: Món canh chay, Món kho thực dưỡng, Salad rau củ...'
                  : 'VD: Dinh dưỡng xanh, Cẩm nang sống khỏe, Kinh nghiệm ăn chay...'
              }
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
