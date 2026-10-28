// client/src/features/admin/components/AdminMembersTab.jsx
import { useEffect, useState, useCallback } from 'react';
import AdminMemberContentModal from './AdminMemberContentModal.jsx';
import { Table, Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { adminService } from '../../../services/adminService.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../../utils/syncEvents.js';
import AdminMemberStatusModal from './AdminMemberStatusModal.jsx';

export default function AdminMembersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUserContent, setSelectedUserContent] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [deletingUserId, setDeletingUserId] = useState(null);

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
  }, [fetchUsers]);

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

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    try {
      await adminService.updateUserStatus(user.user_id, nextStatus);
      setActionMessage(`Đã ${nextStatus === 'LOCKED' ? 'khóa' : 'mở khóa'} tài khoản của ${user.full_name}`);
      emitSyncEvent('USER_CHANGED', { userId: user.user_id, status: nextStatus });
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = (userId) => {
    setDeletingUserId(userId);
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUserId) return;
    try {
      await adminService.deleteUser(deletingUserId);
      setActionMessage('Đã chuyển tài khoản sang trạng thái Đã xóa');
      emitSyncEvent('USER_CHANGED', { userId: deletingUserId });
      emitSyncEvent('POST_CHANGED');
      emitSyncEvent('COMMENT_CHANGED');
      setDeletingUserId(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
      setDeletingUserId(null);
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
          <p className="text-muted small mb-0">Theo dõi thông tin, xem nội dung đăng tải, khóa/mở khóa hoặc xóa tài khoản thành viên</p>
        </div>
      </div>

      {actionMessage && (
        <Alert variant="success" dismissible onClose={() => setActionMessage('')} className="py-2 small rounded-3">
          <i className="bi bi-check-circle-fill me-2" />{actionMessage}
        </Alert>
      )}

      {/* Bộ lọc và Tìm kiếm */}
      <div className="admin-card mb-3 p-3">
        <Form onSubmit={handleSearchSubmit}>
          <Row className="g-2 align-items-center">
            <Col xs={12} md={7}>
              <Form.Control
                size="sm"
                className="rounded-3"
                placeholder="Tìm kiếm theo họ tên hoặc địa chỉ email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>
            <Col xs={6} md={3}>
              <Form.Select size="sm" className="rounded-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="LOCKED">Bị tạm khóa</option>
                <option value="DELETED">Đã xóa</option>
              </Form.Select>
            </Col>
            <Col xs={6} md={2}>
              <Button type="submit" variant="success" size="sm" className="w-100 rounded-3">
                <i className="bi bi-search me-1" /> Tìm kiếm
              </Button>
            </Col>
          </Row>
        </Form>
      </div>

      {/* 4 Trạng thái UI */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="success" />
          <p className="mt-2 text-muted small">Đang nạp danh sách thành viên...</p>
        </div>
      ) : error ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center rounded-3">
          <span><i className="bi bi-exclamation-triangle me-2" />{error}</span>
          <Button variant="outline-danger" size="sm" onClick={fetchUsers}>Thử lại</Button>
        </Alert>
      ) : users.length === 0 ? (
        <div className="text-center py-5 border rounded-4 bg-light">
          <i className="bi bi-person-x text-muted display-4" />
          <p className="mt-2 text-muted">Không tìm thấy thành viên nào phù hợp</p>
          <Button variant="outline-success" size="sm" className="rounded-3" onClick={() => { setSearch(''); setStatusFilter(''); }}>Xóa bộ lọc</Button>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <Table responsive hover className="mb-0 align-middle admin-table">
            <thead>
              <tr>
                <th className="stt-col">STT</th>
                <th>Họ tên & Email</th>
                <th>Vai trò</th>
                <th>Trạng thái tài khoản</th>
                <th>Đóng góp nội dung</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, index) => (
                <tr key={u.user_id}>
                  <td className="stt-col">{index + 1}</td>
                  <td>
                    <div className="fw-semibold text-dark">{u.full_name}</div>
                    <div className="text-muted small">{u.email}</div>
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
                    <strong>{u._count.posts}</strong> bài viết · <strong>{u._count.comments}</strong> bình luận
                  </td>
                  <td className="text-end">
                    <Button variant="outline-primary" size="sm" className="me-1 rounded-3" onClick={() => handleViewContent(u.user_id)} title="Xem bài viết & bình luận">
                      <i className="bi bi-eye" />
                    </Button>
                    <Button
                      variant={u.status === 'ACTIVE' ? 'outline-warning' : 'outline-success'}
                      size="sm"
                      className="me-1 rounded-3"
                      onClick={() => handleToggleStatus(u)}
                      title={u.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                    >
                      <i className={`bi bi-${u.status === 'ACTIVE' ? 'lock' : 'unlock'}`} />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="rounded-3"
                      onClick={() => handleDeleteUser(u.user_id)}
                      disabled={u.status === 'DELETED'}
                      title="Xóa tài khoản"
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

      {/* Modal xem nội dung của User */}
      <AdminMemberContentModal content={selectedUserContent} loading={contentLoading} onHide={() => setSelectedUserContent(null)} />

      <AdminMemberStatusModal
        confirmDelete={deletingUserId}
        onHide={() => setDeletingUserId(null)}
        onConfirm={handleConfirmDeleteUser}
      />
    </div>
  );
}
