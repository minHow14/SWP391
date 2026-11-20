// client/src/features/admin/components/AdminCategoryDetailRow.jsx
// Dòng mở rộng trong bảng danh mục: liệt kê các công thức và bài viết blog đang liên kết với danh mục.
import { Row, Col, Badge, Button } from 'react-bootstrap';

/**
 * Dòng chi tiết của một danh mục.
 * @param {object} props
 * @param {object} props.cat Danh mục kèm quan hệ `recipes` và `post_categories`.
 * @param {Function} props.onPreview Gọi `(item, 'RECIPE' | 'POST')` để mở modal xem nhanh.
 */
export default function AdminCategoryDetailRow({ cat, onPreview }) {
  const recipes = cat?.recipes || [];
  // post_categories là bảng trung gian; lấy ra bài viết bên trong, nếu API đã làm phẳng thì dùng luôn phần tử.
  const posts = (cat?.post_categories || []).map((pc) => pc.post || pc).filter(Boolean);

  return (
    <tr className="admin-category-detail-row bg-light">
      <td colSpan={6} className="p-3">
        <div className="p-3 bg-white border rounded-3 shadow-sm">
          <Row className="g-3">
            {/* Thành phần 1: Tên món ăn & công thức */}
            <Col xs={12} lg={6}>
              <div className="border rounded-3 p-3 h-100 bg-body-tertiary">
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                  <span className="fw-bold small text-success text-uppercase">
                    <i className="bi bi-book-half me-1" /> Tên món ăn & công thức
                  </span>
                  <Badge bg="success-subtle" className="text-success border border-success-subtle">
                    {recipes.length} công thức
                  </Badge>
                </div>

                {recipes.length === 0 ? (
                  <div className="text-muted small py-3 text-center">
                    <i className="bi bi-inbox me-1" />
                    Chưa có món ăn hoặc công thức nào liên kết
                  </div>
                ) : (
                  <div className="list-group list-group-flush small" style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {recipes.map((r) => (
                      <div
                        key={r.recipe_id}
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center px-2 py-2 border-bottom bg-transparent"
                      >
                        <div className="me-2 text-truncate">
                          <div className="fw-semibold text-dark text-truncate">{r.recipe_name}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {r.prep_time > 0 && <span>{r.prep_time} phút · </span>}
                            {r.total_calories > 0 && <span>{r.total_calories} kcal</span>}
                          </div>
                        </div>
                        <Button
                          variant="outline-success"
                          size="sm"
                          className="rounded-3 px-2 py-0 text-nowrap"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => onPreview(r, 'RECIPE')}
                        >
                          Chi tiết &rarr;
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Col>

            {/* Thành phần 2: Blog (chứa các bài viết) */}
            <Col xs={12} lg={6}>
              <div className="border rounded-3 p-3 h-100 bg-body-tertiary">
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                  <span className="fw-bold small text-primary text-uppercase">
                    <i className="bi bi-journal-richtext me-1" /> Blog (chứa các bài viết)
                  </span>
                  <Badge bg="primary-subtle" className="text-primary border border-primary-subtle">
                    {posts.length} bài viết
                  </Badge>
                </div>

                {posts.length === 0 ? (
                  <div className="text-muted small py-3 text-center">
                    <i className="bi bi-journal-x me-1" />
                    Chưa có bài viết blog nào liên kết
                  </div>
                ) : (
                  <div className="list-group list-group-flush small" style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {posts.map((p) => {
                      const title = p.blog?.title || p.video?.title || p.title || 'Bài viết không tiêu đề';
                      const author = p.author?.full_name || 'Ẩn danh';
                      return (
                        <div
                          key={p.post_id}
                          className="list-group-item list-group-item-action d-flex justify-content-between align-items-center px-2 py-2 border-bottom bg-transparent"
                        >
                          <div className="me-2 text-truncate">
                            <div className="fw-semibold text-dark text-truncate">{title}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              <span>Tác giả: {author} · </span>
                              <span>{p.post_type === 'BLOG' ? 'Blog' : 'Video'}</span>
                            </div>
                          </div>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="rounded-3 px-2 py-0 text-nowrap"
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => onPreview(p, 'POST')}
                          >
                            Chi tiết &rarr;
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </div>
      </td>
    </tr>
  );
}
