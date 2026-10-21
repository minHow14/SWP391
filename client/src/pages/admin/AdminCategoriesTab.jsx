// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminCategoriesTab.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Button, Form, Spinner, Alert, Modal, Row, Col, Nav, Badge } from 'react-bootstrap';
import { adminService } from '../../services/adminService.js';
import { useDatabase } from '../../lib/databaseContext.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../lib/syncEvents.js';
import AdminCategoryPreviewModal from './AdminCategoryPreviewModal.jsx';

const getCategoryType = (cat) => {
  if (
    (cat._count?.recipes || 0) > 0 ||
    /món|salad|gỏi|súp|lẩu|xào|chiên|kho|canh|điểm tâm|bánh|chè|tráng miệng|thức uống/i.test(cat.name)
  ) {
    return 'RECIPE';
  }
  return 'BLOG';
};

export default function AdminCategoriesTab() {
  const { data: catalog } = useDatabase();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [previewItem, setPreviewItem] = useState(null);
  const [previewType, setPreviewType] = useState('RECIPE');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE');
  const [activeCategory, setActiveCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [targetType, setTargetType] = useState('RECIPE');
  const [actionMsg, setActionMsg] = useState('');

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getCategories();
      setCategories(res.data);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const unsubscribe = subscribeSyncEvent('CATEGORY_CHANGED', () => {
      fetchCategories();
    });
    return unsubscribe;
  }, [fetchCategories]);

  const toggleExpand = (catId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const recipeCount = useMemo(() => categories.filter((c) => getCategoryType(c) === 'RECIPE').length, [categories]);
  const blogCount = useMemo(() => categories.filter((c) => getCategoryType(c) === 'BLOG').length, [categories]);

  const handleOpenCreate = (preselectedType = 'RECIPE') => {
    setModalMode('CREATE');
    setActiveCategory(null);
    setCategoryName('');
    setTargetType(preselectedType);
    setShowModal(true);
  };

  const handleOpenEdit = (cat) => {
    setModalMode('EDIT');
    setActiveCategory(cat);
    setCategoryName(cat.name);
    setTargetType(getCategoryType(cat));
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    try {
      if (modalMode === 'CREATE') {
        await adminService.createCategory({ name: categoryName.trim() });
        setActionMsg(`Đã tạo danh mục "${categoryName.trim()}" thành công`);
      } else {
        await adminService.updateCategory(activeCategory.category_id, { name: categoryName.trim() });
        setActionMsg(`Đã cập nhật danh mục thành "${categoryName.trim()}"`);
      }
      emitSyncEvent('CATEGORY_CHANGED');
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục "${cat.name}"?`)) return;
    try {
      await adminService.deleteCategory(cat.category_id);
      setActionMsg(`Đã xóa danh mục "${cat.name}" thành công`);
      emitSyncEvent('CATEGORY_CHANGED');
      fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredCategories = categories.filter((cat) => {
    const matchSearch = cat.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'ALL' || getCategoryType(cat) === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Quản Lý Phân Loại & Danh Mục</h4>
          <p className="text-muted small mb-0">Quản lý danh mục món ăn (công thức, thực đơn) và chuyên mục bài viết (blog cộng đồng)</p>
        </div>
        <Button variant="success" size="sm" className="rounded-3 px-3 fw-medium" onClick={() => handleOpenCreate(typeFilter === 'BLOG' ? 'BLOG' : 'RECIPE')}>
          + Thêm danh mục mới
        </Button>
      </div>

      {actionMsg && (
        <Alert variant="success" dismissible onClose={() => setActionMsg('')} className="cx-alert-banner py-2 px-3 mb-3">
          <i className="bi bi-check-circle-fill me-2 text-success" />{actionMsg}
        </Alert>
      )}

      {/* Bộ lọc Segmented Nav (Màu trung tính trang nhã, không dùng màu xanh) & Tìm kiếm */}
      <div className="admin-card mb-3 p-2 bg-light border">
        <Row className="g-2 align-items-center">
          <Col xs={12} md={7}>
            <Nav className="admin-segmented-nav" activeKey={typeFilter} onSelect={(k) => setTypeFilter(k)}>
              <Nav.Item>
                <Nav.Link eventKey="ALL">
                  Tất cả ({categories.length})
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="RECIPE">
                  Món ăn & Công thức ({recipeCount})
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="BLOG">
                  Bài viết & Blog ({blogCount})
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>
          <Col xs={12} md={5}>
            <Form.Control
              size="sm"
              className="bg-white rounded-3"
              placeholder="Tìm kiếm danh mục..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
        </Row>
      </div>

      {loading ? (
        <div className="admin-card p-4 text-center">
          <Spinner animation="border" variant="success" size="sm" className="me-2" />
          <span className="text-muted small">Đang nạp danh mục...</span>
        </div>
      ) : error ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center rounded-3">
          <span>{error}</span>
          <Button variant="outline-danger" size="sm" className="rounded-3" onClick={fetchCategories}>Thử lại</Button>
        </Alert>
      ) : filteredCategories.length === 0 ? (
        <div className="cx-empty-state">
          <h5 className="fw-bold mb-1">Không tìm thấy danh mục phù hợp</h5>
          <p className="text-muted small mb-3">Chưa có danh mục nào thuộc bộ lọc này.</p>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <Table responsive hover className="mb-0 align-middle admin-table">
            <thead>
              <tr>
                <th style={{ width: 68 }} className="ps-3 text-center">STT</th>
                <th>Tên danh mục</th>
                <th>Phân loại nhóm</th>
                <th>Công thức liên kết</th>
                <th>Bài viết liên kết</th>
                <th className="text-end pe-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((cat, index) => {
                const isFood = getCategoryType(cat) === 'RECIPE';
                const isExpanded = expandedIds.has(cat.category_id);

                const catRecipes = cat.recipes?.length > 0
                  ? cat.recipes
                  : (catalog?.recipes?.filter((r) => r.category_id === cat.category_id) || []);

                const catPosts = cat.post_categories?.length > 0
                  ? cat.post_categories.map((pc) => pc.post || pc)
                  : (catalog?.posts?.filter((p) => p.category_id === cat.category_id || p.post_categories?.some((pc) => pc.category_id === cat.category_id)) || []);

                const hasLinks = catRecipes.length > 0 || catPosts.length > 0;

                return (
                  <FragmentWrapper key={cat.category_id}>
                    {/* Dòng chính danh mục với nút mũi tên dropdown ngay trước STT */}
                    <tr className={isExpanded ? 'table-light' : ''}>
                      <td className="ps-3 text-center">
                        <button
                          type="button"
                          className="admin-stt-toggle"
                          onClick={() => toggleExpand(cat.category_id)}
                          title={isExpanded ? 'Thu gọn chi tiết' : 'Sổ xuống xem chi tiết'}
                        >
                          <span
                            className="admin-stt-arrow"
                            style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}
                          >
                            ▶
                          </span>
                          <span>{index + 1}</span>
                        </button>
                      </td>
                      <td>
                        <span
                          className="fw-semibold text-dark cursor-pointer"
                          onClick={() => toggleExpand(cat.category_id)}
                          title="Bấm để xem chi tiết bên dưới"
                        >
                          {cat.name}
                        </span>
                      </td>
                      <td>
                        <span className={`cx-badge ${isFood ? 'cx-badge-active' : 'cx-badge-info'}`}>
                          {isFood ? 'Món ăn & Công thức' : 'Bài viết & Blog'}
                        </span>
                      </td>
                      <td>
                        <Badge
                          bg={catRecipes.length > 0 ? 'success-subtle' : 'light'}
                          className={`cursor-pointer ${catRecipes.length > 0 ? 'text-success border border-success-subtle' : 'text-muted border'}`}
                          onClick={() => toggleExpand(cat.category_id)}
                        >
                          {catRecipes.length} công thức
                        </Badge>
                      </td>
                      <td>
                        <Badge
                          bg={catPosts.length > 0 ? 'primary-subtle' : 'light'}
                          className={`cursor-pointer ${catPosts.length > 0 ? 'text-primary border border-primary-subtle' : 'text-muted border'}`}
                          onClick={() => toggleExpand(cat.category_id)}
                        >
                          {catPosts.length} bài viết
                        </Badge>
                      </td>
                      <td className="text-end pe-3">
                        <div className="d-inline-flex gap-1">
                          <Button variant="outline-primary" size="sm" className="rounded-3 px-2 py-1" style={{ fontSize: '0.8rem' }} onClick={() => handleOpenEdit(cat)}>
                            Sửa
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="rounded-3 px-2 py-1"
                            style={{ fontSize: '0.8rem' }}
                            onClick={() => handleDelete(cat)}
                            disabled={hasLinks}
                            title={hasLinks ? 'Không thể xóa khi đang có dữ liệu liên kết' : 'Xóa danh mục'}
                          >
                            Xóa
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* Mục sổ xuống (Dropdown) ngay tại chỉ mục đó */}
                    {isExpanded && (
                      <tr className="bg-light">
                        <td colSpan={6} className="p-0 border-top-0 border-bottom">
                          <div className="p-3 bg-light border-top border-bottom">
                            <div className="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom">
                              <span className="small fw-bold text-dark">
                                Dữ liệu chi tiết thuộc danh mục: <u>{cat.name}</u>
                              </span>
                              <button
                                type="button"
                                className="btn btn-link btn-sm text-muted p-0 small text-decoration-none"
                                onClick={() => toggleExpand(cat.category_id)}
                              >
                                Thu gọn ▲
                              </button>
                            </div>
                            <Row className="g-3">
                              <Col xs={12} md={6}>
                                <div className="p-3 bg-white rounded-3 border h-100">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-bold small text-success">
                                      Công thức món ăn ({catRecipes.length})
                                    </span>
                                    <small className="text-muted">Bấm để xem</small>
                                  </div>
                                  {catRecipes.length === 0 ? (
                                    <div className="text-muted small py-2">Chưa có công thức món ăn nào.</div>
                                  ) : (
                                    <div className="list-group list-group-flush small" style={{ maxHeight: 200, overflowY: 'auto' }}>
                                      {catRecipes.map((r) => (
                                        <button
                                          key={r.recipe_id}
                                          type="button"
                                          className="list-group-item list-group-item-action d-flex justify-content-between align-items-center px-2 py-2 border-bottom text-start"
                                          onClick={() => { setPreviewItem(r); setPreviewType('RECIPE'); }}
                                        >
                                          <span className="text-truncate me-2 fw-medium text-dark">{r.recipe_name}</span>
                                          <span className="badge bg-light text-success border">Chi tiết &rarr;</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </Col>

                              <Col xs={12} md={6}>
                                <div className="p-3 bg-white rounded-3 border h-100">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-bold small text-primary">
                                      Bài viết & Video ({catPosts.length})
                                    </span>
                                    <small className="text-muted">Bấm để xem</small>
                                  </div>
                                  {catPosts.length === 0 ? (
                                    <div className="text-muted small py-2">Chưa có bài viết hoặc video nào.</div>
                                  ) : (
                                    <div className="list-group list-group-flush small" style={{ maxHeight: 200, overflowY: 'auto' }}>
                                      {catPosts.map((p) => {
                                        const postTitle = p.blog?.title || p.video?.title || p.title || 'Bài viết không tên';
                                        return (
                                          <button
                                            key={p.post_id}
                                            type="button"
                                            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center px-2 py-2 border-bottom text-start"
                                            onClick={() => { setPreviewItem(p); setPreviewType('POST'); }}
                                          >
                                            <span className="text-truncate me-2 fw-medium text-dark">{postTitle}</span>
                                            <span className="badge bg-light text-primary border">Chi tiết &rarr;</span>
                                          </button>
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
                    )}
                  </FragmentWrapper>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      {/* Modal Chi tiết Công thức / Bài viết */}
      <AdminCategoryPreviewModal
        show={!!previewItem}
        onHide={() => setPreviewItem(null)}
        item={previewItem}
        itemType={previewType}
      />

      {/* Modal Thêm / Sửa Danh mục */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton className="border-bottom">
            <Modal.Title className="fs-6 fw-bold text-dark">
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
                  Món Ăn & Công Thức
                </Button>
                <Button
                  type="button"
                  variant={targetType === 'BLOG' ? 'primary' : 'outline-secondary'}
                  size="sm"
                  className="rounded-3"
                  onClick={() => setTargetType('BLOG')}
                >
                  Bài Viết & Blog
                </Button>
              </div>
            </Form.Group>

            <Form.Group controlId="categoryNameInput">
              <Form.Label className="small fw-semibold">
                Tên danh mục {targetType === 'RECIPE' ? 'món ăn' : 'bài viết'}
              </Form.Label>
              <Form.Control
                autoFocus
                className="rounded-3"
                placeholder={
                  targetType === 'RECIPE'
                    ? 'VD: Món Canh, Món Kho Thực Dưỡng, Salad Rau Củ...'
                    : 'VD: Cẩm Nang Dinh Dưỡng, Kinh Nghiệm Sống Xanh, Mẹo Nấu...'
                }
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-top">
            <Button variant="secondary" size="sm" className="rounded-3 px-3" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button variant="success" size="sm" className="rounded-3 px-3 fw-medium" type="submit">
              {modalMode === 'CREATE' ? 'Tạo danh mục' : 'Lưu thay đổi'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

function FragmentWrapper({ children }) {
  return children;
}
