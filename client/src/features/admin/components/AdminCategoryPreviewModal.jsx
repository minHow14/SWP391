// client/src/features/admin/components/AdminCategoryPreviewModal.jsx
import { Modal, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router';

export default function AdminCategoryPreviewModal({ show, onHide, item, itemType }) {
  if (!item) return null;

  const isRecipe = itemType === 'RECIPE';

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title className="fs-6 fw-bold text-dark">
          <i className={`bi ${isRecipe ? 'bi-book-half text-success' : 'bi-journal-richtext text-primary'} me-2`} />
          {isRecipe ? 'Chi Tiết Công Thức Món Ăn' : 'Chi Tiết Bài Viết Blog'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '72vh', overflowY: 'auto' }}>
        {isRecipe ? (
          <div>
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 className="fw-bold text-dark mb-1">{item.recipe_name}</h5>
                <div className="d-flex flex-wrap gap-3 text-muted small">
                  {item.prep_time > 0 && (
                    <span>
                      <i className="bi bi-clock me-1" />
                      Chuẩn bị: {item.prep_time} phút
                    </span>
                  )}
                  {item.total_calories > 0 && (
                    <span>
                      <i className="bi bi-fire me-1" />
                      Năng lượng: {item.total_calories} kcal
                    </span>
                  )}
                </div>
              </div>
              <Badge bg="success-subtle" className="text-success border border-success-subtle px-2 py-1">
                Công thức món
              </Badge>
            </div>

            {item.image_url && (
              <div className="mb-3 text-center">
                <img
                  src={item.image_url}
                  alt={item.recipe_name}
                  className="rounded-3 shadow-sm img-fluid"
                  style={{ maxHeight: 240, objectFit: 'cover' }}
                />
              </div>
            )}

            {item.description && (
              <div className="mb-3">
                <div className="fw-semibold small text-muted text-uppercase mb-1">Mô tả món ăn:</div>
                <p className="small text-secondary bg-light p-3 rounded-3 mb-0">{item.description}</p>
              </div>
            )}

            {item.instructions && (
              <div>
                <div className="fw-semibold small text-muted text-uppercase mb-1">Cách chế biến chi tiết:</div>
                <div className="small text-dark p-3 border rounded-3 bg-white" style={{ whiteSpace: 'pre-line' }}>
                  {item.instructions}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 className="fw-bold text-dark mb-1">
                  {item.blog?.title || item.video?.title || item.title || 'Bài viết không tiêu đề'}
                </h5>
                <div className="text-muted small">
                  <span className="me-3">
                    <i className="bi bi-person me-1" />
                    Tác giả: {item.author?.full_name || 'Ẩn danh'}
                  </span>
                  {item.created_at && (
                    <span>
                      <i className="bi bi-calendar3 me-1" />
                      Ngày đăng: {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                </div>
              </div>
              <Badge
                bg={item.post_type === 'BLOG' ? 'primary-subtle' : 'danger-subtle'}
                className={`border px-2 py-1 ${item.post_type === 'BLOG' ? 'text-primary border-primary-subtle' : 'text-danger border-danger-subtle'}`}
              >
                {item.post_type === 'BLOG' ? 'Blog chia sẻ' : 'Video nấu ăn'}
              </Badge>
            </div>

            <div className="mb-3">
              <div className="fw-semibold small text-muted text-uppercase mb-1">Nội dung bài viết:</div>
              <div
                className="small text-dark p-3 border rounded-3 bg-light"
                style={{ whiteSpace: 'pre-line', maxHeight: 320, overflowY: 'auto' }}
              >
                {item.blog?.content || item.video?.transcript || item.content || 'Nội dung đang được cập nhật.'}
              </div>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="border-top d-flex justify-content-between">
        <div>
          {isRecipe ? (
            <Link to="/cong-thuc" target="_blank" className="btn btn-outline-success btn-sm rounded-3">
              Mở trang Công thức người dùng &rarr;
            </Link>
          ) : (
            <Link to="/cong-dong" target="_blank" className="btn btn-outline-primary btn-sm rounded-3">
              Mở trang Cộng đồng người dùng &rarr;
            </Link>
          )}
        </div>
        <Button variant="secondary" size="sm" className="rounded-3 px-3" onClick={onHide}>
          Đóng
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
