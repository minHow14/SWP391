// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminMembersTab.jsx
import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Form, Row, Col, Spinner, Alert, Modal } from 'react-bootstrap';
import { adminService } from '../../services/adminService.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../lib/syncEvents.js';

export default function AdminMembersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUserContent, setSelectedUserContent] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getUsers({ search, status: statusFilter, limit: 50 });
      setUsers(res.data);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [statusFilter, fetchUsers]);

  // Tự động cập nhật danh sách khi có sự kiện thay đổi người dùng
  useEffect(() => {
    const unsubscribe = subscribeSyncEvent('USER_CHANGED', () => {
      fetchUsers();
    });
    return unsubscribe;
  }, [fetchUsers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleStatus = async (targetUser) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    try {
      await adminService.updateUserStatus(targetUser.user_id, nextStatus);
      setActionMessage(`Đã ${nextStatus === 'LOCKED' ? 'khóa' : 'mở khóa'} tài khoản của ${targetUser.full_name}`);
      emitSyncEvent('USER_CHANGED', { userId: targetUser.user_id, status: nextStatus });
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn chuyển tài khoản này sang trạng thái Đã xóa?')) return;
    try {
      await adminService.deleteUser(userId);
      setActionMessage('Đã chuyển tài khoản sang trạng thái Đã xóa');
      emitSyncEvent('USER_CHANGED', { userId });
      emitSyncEvent('POST_CHANGED');
      emitSyncEvent('COMMENT_CHANGED');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleViewContent = async (userId) => {
    setContentLoading(true);
    try {
      const res = await adminService.getUserContent(userId);
      setSelectedUserContent(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setContentLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Quản Lý Thành Viên Cộng Đồng</h4>
          <p className="text-muted small mb-0">Theo dõi thông tin, phân quyền, xem nội dung đăng tải hoặc khóa tài khoản thành viên</p>
        </div>
      </div>

      {actionMessage && (
        <Alert variant="success" dismissible onClose={() => setActionMessage('')} className="cx-alert-banner py-2 px-3 mb-3">
          <i className="bi bi-check-circle-fill me-2 text-success" />{actionMessage}
        </Alert>
      )}

      {/* Bộ lọc và Tìm kiếm */}
      <div className="admin-filter-bar mb-3">
        <Form onSubmit={handleSearchSubmit}>
          <Row className="g-2 align-items-center">
            <Col xs={12} md={7}>
              <div className="admin-search-wrapper">
                <i className="bi bi-search admin-search-icon" />
                <Form.Control
                  size="sm"
                  className="admin-search-input"
                  placeholder="Tìm kiếm theo họ tên hoặc địa chỉ email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </Col>
            <Col xs={7} md={3}>
              <Form.Select size="sm" className="admin-select-input rounded-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="LOCKED">Bị tạm khóa</option>
                <option value="DELETED">Đã xóa</option>
              </Form.Select>
            </Col>
            <Col xs={5} md={2}>
              <Button type="submit" variant="success" size="sm" className="w-100 rounded-3 fw-medium">
                Tìm kiếm
              </Button>
            </Col>
          </Row>
        </Form>
      </div>

      {/* 4 Trạng thái UI */}
      {loading ? (
        <div className="admin-card p-4 text-center">
          <Spinner animation="border" variant="success" size="sm" className="me-2" />
          <span className="text-muted small">Đang nạp danh sách thành viên...</span>
        </div>
      ) : error ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center rounded-3">
          <span><i className="bi bi-exclamation-triangle-fill me-2" />{error}</span>
          <Button variant="outline-danger" size="sm" className="rounded-3" onClick={fetchUsers}>Thử lại</Button>
        </Alert>
      ) : users.length === 0 ? (
        <div className="cx-empty-state">
          <div className="cx-empty-icon">
            <i className="bi bi-person-x" />
          </div>
          <h5 className="fw-bold mb-1">Không tìm thấy thành viên nào</h5>
          <p className="text-muted small mb-3">Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các điều kiện lọc trạng thái.</p>
          <Button variant="outline-success" size="sm" className="rounded-3 px-3" onClick={() => { setSearch(''); setStatusFilter(''); }}>
            Xóa bộ lọc
          </Button>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <Table responsive hover className="mb-0 align-middle admin-table">
            <thead>
              <tr>
                <th className="stt-col">STT</th>
                <th>Thành viên & Email</th>
                <th>Vai trò</th>
                <th>Trạng thái tài khoản</th>
                <th>Đóng góp nội dung</th>
                <th className="text-end pe-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, index) => (
                <tr key={u.user_id}>
                  <td className="stt-col">{index + 1}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="cx-user-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                        {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="fw-semibold text-dark">{u.full_name}</div>
                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`cx-badge ${u.role === 1 ? 'cx-badge-danger' : 'cx-badge-neutral'}`}>
                      {u.role === 1 ? 'Quản trị viên' : 'Thành viên'}
                    </span>
                  </td>
                  <td>
                    <span className={`cx-badge ${
                      u.status === 'ACTIVE' ? 'cx-badge-active' :
                      u.status === 'LOCKED' ? 'cx-badge-locked' : 'cx-badge-neutral'
                    }`}>
                      {u.status === 'ACTIVE' ? 'Đang hoạt động' : u.status === 'LOCKED' ? 'Bị tạm khóa' : 'Đã xóa'}
                    </span>
                  </td>
                  <td className="small text-muted">
                    <span className="me-2"><i className="bi bi-journal-text me-1 text-secondary" /><strong>{u._count.posts}</strong> bài</span>
                    <span><i className="bi bi-chat-text me-1 text-secondary" /><strong>{u._count.comments}</strong> bình luận</span>
                  </td>
                  <td className="text-end pe-3">
                    <div className="d-inline-flex gap-1">
                      <Button variant="outline-primary" size="sm" className="admin-action-btn" onClick={() => handleViewContent(u.user_id)} title="Xem bài viết & bình luận">
                        <i className="bi bi-eye" />
                      </Button>
                      <Button
                        variant={u.status === 'ACTIVE' ? 'outline-warning' : 'outline-success'}
                        size="sm"
                        className="admin-action-btn"
                        onClick={() => handleToggleStatus(u)}
                        title={u.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                      >
                        <i className={`bi bi-${u.status === 'ACTIVE' ? 'lock' : 'unlock'}`} />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="admin-action-btn"
                        onClick={() => handleDeleteUser(u.user_id)}
                        disabled={u.status === 'DELETED'}
                        title="Xóa tài khoản"
                      >
                        <i className="bi bi-trash" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* Modal xem nội dung của User */}
      <Modal show={!!selectedUserContent} onHide={() => setSelectedUserContent(null)} size="lg" centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2">
            <i className="bi bi-person-lines-fill text-success" />
            Nội dung đóng góp: <span className="text-success">{selectedUserContent?.user?.full_name}</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {contentLoading ? (
            <div className="text-center py-4"><Spinner animation="border" variant="success" size="sm" /></div>
          ) : (
            <>
              <h6 className="fw-bold mb-2 text-dark small text-uppercase">Bài viết & Video ({selectedUserContent?.posts?.length || 0})</h6>
              {selectedUserContent?.posts?.length === 0 ? (
                <p className="text-muted small">Người dùng chưa đăng tải bài viết nào.</p>
              ) : (
                <ul className="list-group mb-3 small">
                  {selectedUserContent?.posts?.map((p) => (
                    <li key={p.post_id} className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-truncate me-2">
                        <strong className="text-secondary">[{p.post_type === 'BLOG' ? 'Blog' : 'Video'}]</strong> {p.blog?.title || p.video?.title || 'Không có tiêu đề'}
                      </span>
                      <span className={`cx-badge ${p.status === 'PUBLISHED' ? 'cx-badge-active' : 'cx-badge-locked'}`}>
                        {p.status === 'PUBLISHED' ? 'Đã duyệt' : p.status === 'HIDDEN_BY_AI' ? 'AI đã ẩn' : p.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <h6 className="fw-bold mb-2 text-dark small text-uppercase">Bình luận gần đây ({selectedUserContent?.comments?.length || 0})</h6>
              {selectedUserContent?.comments?.length === 0 ? (
                <p className="text-muted small">Người dùng chưa để lại bình luận nào.</p>
              ) : (
                <ul className="list-group small">
                  {selectedUserContent?.comments?.map((c) => (
                    <li key={c.comment_id} className="list-group-item py-2">
                      <div className="fw-semibold text-truncate">{c.content}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>Trên bài: {c.post?.blog?.title || c.post?.video?.title}</div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
