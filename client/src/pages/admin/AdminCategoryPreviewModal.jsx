// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminCategoryPreviewModal.jsx
import { Modal, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router';

export default function AdminCategoryPreviewModal({ show, onHide, item, itemType }) {
  if (!item) return null;

  const isRecipe = itemType === 'RECIPE';

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title className="fs-6 fw-bold text-dark">
          {isRecipe ? 'Chi Tiết Công Thức Món Ăn' : 'Chi Tiết Bài Viết / Video'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {isRecipe ? (
          <div>
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 className="fw-bold text-dark mb-1">{item.recipe_name}</h5>
                <div className="d-flex flex-wrap gap-3 text-muted small">
                  {item.prep_time > 0 && <span>Thời gian chuẩn bị: {item.prep_time} phút</span>}
                  {item.total_calories > 0 && <span>Năng lượng: {item.total_calories} kcal</span>}
                </div>
              </div>
              <Badge bg="success-subtle" className="text-success border border-success-subtle px-2 py-1">
                Công thức
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
                <div className="fw-semibold small text-muted text-uppercase mb-1">Mô tả:</div>
                <p className="small text-secondary bg-light p-3 rounded-3">{item.description}</p>
              </div>
            )}

            {item.instructions && (
              <div>
                <div className="fw-semibold small text-muted text-uppercase mb-1">Hướng dẫn nấu:</div>
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
                <h5 className="fw-bold text-dark mb-1">{item.blog?.title || item.video?.title || item.title || 'Không có tiêu đề'}</h5>
                <div className="text-muted small">
                  <span className="me-3">Tác giả: {item.author?.full_name || 'Ẩn danh'}</span>
                  {item.created_at && (
                    <span>Ngày đăng: {new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                  )}
                </div>
              </div>
              <Badge bg={item.post_type === 'BLOG' ? 'primary-subtle' : 'danger-subtle'} className={`border px-2 py-1 ${item.post_type === 'BLOG' ? 'text-primary border-primary-subtle' : 'text-danger border-danger-subtle'}`}>
                {item.post_type === 'BLOG' ? 'Blog chia sẻ' : 'Video nấu ăn'}
              </Badge>
            </div>

            <div className="mb-3">
              <div className="fw-semibold small text-muted text-uppercase mb-1">Nội dung chi tiết:</div>
              <div className="small text-dark p-3 border rounded-3 bg-light" style={{ whiteSpace: 'pre-line', maxHeight: 300, overflowY: 'auto' }}>
                {item.blog?.content || item.video?.transcript || item.content || 'Không có nội dung văn bản.'}
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
