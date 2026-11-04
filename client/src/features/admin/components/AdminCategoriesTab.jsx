// client/src/features/admin/components/AdminCategoriesTab.jsx
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Table, Button, Form, Spinner, Alert, Row, Col, Nav } from 'react-bootstrap';
import { adminService } from '../../../services/adminService.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../../utils/syncEvents.js';
import AdminCategoryRow from './AdminCategoryRow.jsx';
import AdminCategoryPreviewModal from './AdminCategoryPreviewModal.jsx';
import AdminCategoryFormModal from './AdminCategoryFormModal.jsx';

const hasCategoryUsage = (cat, type) => type === 'RECIPE'
  ? (cat.recipes?.length ?? cat._count?.recipes ?? 0) > 0
  : (cat.post_categories?.length ?? cat._count?.post_categories ?? 0) > 0;

export default function AdminCategoriesTab() {
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
  const [actionMsg, setActionMsg] = useState('');

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getCategories();
      setCategories(res.data || []);
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
    const unsubscribe = subscribeSyncEvent('CATEGORY_CHANGED', fetchCategories);
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

  const recipeCount = useMemo(() => categories.filter((c) => hasCategoryUsage(c, 'RECIPE')).length, [categories]);
  const blogCount = useMemo(() => categories.filter((c) => hasCategoryUsage(c, 'BLOG')).length, [categories]);

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchSearch = cat.name.toLowerCase().includes(search.trim().toLowerCase());
      const matchType = typeFilter === 'ALL' || hasCategoryUsage(cat, typeFilter);
      return matchSearch && matchType;
    });
  }, [categories, search, typeFilter]);

  const handleOpenCreate = () => {
    setModalMode('CREATE');
    setActiveCategory(null);
    setCategoryName('');
    setShowModal(true);
  };

  const handleOpenEdit = (cat) => {
    setModalMode('EDIT');
    setActiveCategory(cat);
    setCategoryName(cat.name);
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

  const handlePreview = (item, type) => {
    setPreviewItem(item);
    setPreviewType(type);
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Quản Lý Danh Mục Món & Blog</h4>
          <p className="text-muted small mb-0">Nhóm hiển thị theo công thức và bài viết đang liên kết với danh mục</p>
        </div>
        <Button variant="success" size="sm" className="rounded-3 px-3 fw-medium" onClick={() => handleOpenCreate()}>
          <i className="bi bi-plus-lg me-1" /> Thêm danh mục mới
        </Button>
      </div>

      {actionMsg && (
        <Alert variant="success" dismissible onClose={() => setActionMsg('')} className="py-2 small rounded-3">
          <i className="bi bi-check-circle-fill me-2" />{actionMsg}
        </Alert>
      )}

      {/* Segmented Nav cho 2 nhóm: Món ăn & công thức vs Blog */}
      <div className="admin-card mb-3 p-2 bg-light border">
        <Row className="g-2 align-items-center">
          <Col xs={12} md={8}>
            <Nav className="admin-segmented-nav" activeKey={typeFilter} onSelect={(k) => setTypeFilter(k)}>
              <Nav.Item>
                <Nav.Link eventKey="ALL">Tất cả ({categories.length})</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="RECIPE">
                  <i className="bi bi-book-half me-1" /> Tên món ăn & công thức ({recipeCount})
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="BLOG">
                  <i className="bi bi-journal-richtext me-1" /> Blog (bài viết) ({blogCount})
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>
          <Col xs={12} md={4}>
            <Form.Control
              size="sm"
              className="bg-white rounded-3"
              aria-label="Tìm kiếm danh mục" placeholder="Tìm kiếm danh mục..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
        </Row>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="success" />
          <p className="mt-2 text-muted small">Đang nạp danh mục...</p>
        </div>
      ) : error ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center rounded-3">
          <span><i className="bi bi-exclamation-triangle me-2" />{error}</span>
          <Button variant="outline-danger" size="sm" onClick={fetchCategories}>Thử lại</Button>
        </Alert>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-5 border rounded-4 bg-light">
          <i className="bi bi-tags text-muted display-4" />
          <p className="mt-2 text-muted">Chưa có danh mục nào phù hợp với bộ lọc</p>
          <Button variant="success" size="sm" className="rounded-3" onClick={() => handleOpenCreate()}>Tạo danh mục</Button>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <Table responsive hover className="mb-0 align-middle admin-table">
            <thead>
              <tr>
                <th style={{ width: 75 }} className="ps-3 text-center">STT</th>
                <th>Tên danh mục</th>
                <th>Đang sử dụng cho</th>
                <th>Công thức liên kết</th>
                <th>Bài viết liên kết</th>
                <th className="text-end pe-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((cat, index) => (
                <AdminCategoryRow
                  key={cat.category_id}
                  cat={cat}
                  index={index}
                  isExpanded={expandedIds.has(cat.category_id)}
                  recipeTotal={cat.recipes?.length ?? (cat._count?.recipes || 0)}
                  postTotal={cat.post_categories?.length ?? (cat._count?.post_categories || 0)}
                  onToggle={() => toggleExpand(cat.category_id)}
                  onEdit={() => handleOpenEdit(cat)}
                  onDelete={() => handleDelete(cat)}
                  onPreview={handlePreview}
                />
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* Modal Chi tiết Công thức / Bài viết */}
      <AdminCategoryPreviewModal
        show={!!previewItem} onHide={() => setPreviewItem(null)}
        item={previewItem}
        itemType={previewType}
      />

      {/* Modal Thêm / Sửa Danh mục */}
      <AdminCategoryFormModal
        show={showModal} onHide={() => setShowModal(false)}
        modalMode={modalMode}
        categoryName={categoryName} setCategoryName={setCategoryName}
        onSubmit={handleSave}
      />
    </div>
  );
}
