// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminCategoriesTab.jsx
import { useEffect, useState } from 'react';
import { Table, Button, Form, Spinner, Alert, Modal } from 'react-bootstrap';
import { adminService } from '../../services/adminService.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../lib/syncEvents.js';

export default function AdminCategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE');
  const [activeCategory, setActiveCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchCategories = async () => {
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
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Tự động cập nhật danh mục khi có thay đổi
  useEffect(() => {
    const unsubscribe = subscribeSyncEvent('CATEGORY_CHANGED', () => {
      fetchCategories();
    });
    return unsubscribe;
  }, []);

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

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Quản Lý Danh Mục Món Chay & Công Thức</h4>
          <p className="text-muted small mb-0">Tạo mới, chỉnh sửa và quản lý các phân loại thực đơn, món ăn và công thức dinh dưỡng</p>
        </div>
        <Button variant="success" size="sm" className="rounded-3" onClick={handleOpenCreate}>
          <i className="bi bi-plus-lg me-1" /> Thêm danh mục mới
        </Button>
      </div>

      {actionMsg && (
        <Alert variant="success" dismissible onClose={() => setActionMsg('')} className="py-2 small rounded-3">
          <i className="bi bi-check-circle-fill me-2" />{actionMsg}
        </Alert>
      )}

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
      ) : categories.length === 0 ? (
        <div className="text-center py-5 border rounded-4 bg-light">
          <i className="bi bi-tags text-muted display-4" />
          <p className="mt-2 text-muted">Chưa có danh mục món ăn nào trong hệ thống</p>
          <Button variant="success" size="sm" className="rounded-3" onClick={handleOpenCreate}>Tạo danh mục đầu tiên</Button>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <Table responsive hover className="mb-0 align-middle admin-table">
            <thead>
              <tr>
                <th className="stt-col">STT</th>
                <th>Tên danh mục món ăn & công thức</th>
                <th>Bài viết liên kết</th>
                <th>Công thức liên kết</th>
                <th className="text-end">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, index) => (
                <tr key={cat.category_id}>
                  <td className="stt-col">{index + 1}</td>
                  <td className="fw-semibold text-dark">{cat.name}</td>
                  <td>
                    <span className="cx-badge cx-badge-neutral">
                      {cat._count?.post_categories || 0} bài viết
                    </span>
                  </td>
                  <td>
                    <span className="cx-badge cx-badge-info">
                      {cat._count?.recipes || 0} công thức
                    </span>
                  </td>
                  <td className="text-end">
                    <Button variant="outline-primary" size="sm" className="me-1 rounded-3" onClick={() => handleOpenEdit(cat)} title="Chỉnh sửa tên danh mục">
                      <i className="bi bi-pencil" />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="rounded-3"
                      onClick={() => handleDelete(cat)}
                      disabled={(cat._count?.post_categories || 0) > 0 || (cat._count?.recipes || 0) > 0}
                      title={(cat._count?.post_categories || 0) > 0 ? 'Không thể xóa khi đang có bài viết hoặc công thức liên kết' : 'Xóa danh mục'}
                    >
                      <i className="bi bi-trash" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* Modal Thêm / Sửa Danh mục */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title className="fs-5 fw-bold">
              {modalMode === 'CREATE' ? 'Thêm Danh Mục Mới' : 'Cập Nhật Tên Danh Mục'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group controlId="categoryNameInput">
              <Form.Label className="small fw-semibold">Tên danh mục phân loại món ăn / công thức</Form.Label>
              <Form.Control
                autoFocus
                className="rounded-3"
                placeholder="VD: Món canh chay, Món kho thực dưỡng, Salad rau củ..."
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" size="sm" className="rounded-3" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button variant="success" size="sm" className="rounded-3" type="submit">
              {modalMode === 'CREATE' ? 'Tạo danh mục' : 'Lưu thay đổi'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
