// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminPortal.jsx
import { useState } from 'react';
import { Container, Row, Col, Nav, Alert } from 'react-bootstrap';
import { Link } from 'react-router';
import { useDatabase } from '../../lib/databaseContext.js';
import '../../Admin.css';

import AdminDashboardTab from './AdminDashboardTab.jsx';
import AdminMembersTab from './AdminMembersTab.jsx';
import AdminPostsTab from './AdminPostsTab.jsx';
import AdminCommentsTab from './AdminCommentsTab.jsx';
import AdminCategoriesTab from './AdminCategoriesTab.jsx';
import AdminAiModerationTab from './AdminAiModerationTab.jsx';
import AdminAiMonitorTab from './AdminAiMonitorTab.jsx';
import AdminReportsTab from './AdminReportsTab.jsx';

export default function AdminPortal() {
  const { user } = useDatabase();
  const [activeTab, setActiveTab] = useState('dashboard');

  // RBAC: Kiểm tra quyền quản trị viên (Role 1)
  if (!user || user.role !== 1) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col xs={12} md={8} lg={6}>
            <div className="admin-card text-center p-4">
              <div className="text-danger display-3 mb-3">
                <i className="bi bi-shield-lock-fill" />
              </div>
              <h4 className="fw-bold text-danger">Khu vực Giới hạn Quyền Hạn</h4>
              <p className="text-muted small">
                Bạn cần đăng nhập bằng tài khoản có quyền <strong>Quản trị viên (ADMIN)</strong> để truy cập cổng thông tin này.
              </p>
              <Alert variant="success" className="text-start small bg-success-subtle border-0">
                <strong>Tài khoản Quản trị viên hệ thống:</strong>
                <div>Email: <code>admin@swp391.com</code></div>
                <div>Mật khẩu: <code>123456</code></div>
              </Alert>
              <div className="d-flex justify-content-center gap-2">
                <Link to="/dang-nhap" className="btn btn-success btn-sm rounded-3">
                  <i className="bi bi-box-arrow-in-right me-1" /> Đến trang Đăng nhập
                </Link>
                <Link to="/" className="btn btn-outline-secondary btn-sm rounded-3">
                  Quay về Trang chủ
                </Link>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  const navItems = [
    { key: 'dashboard', label: 'Tổng quan hệ thống', icon: 'bi-speedometer2' },
    { key: 'members', label: 'Quản lý thành viên', icon: 'bi-people' },
    { key: 'posts', label: 'Bài viết & Video', icon: 'bi-journal-richtext' },
    { key: 'comments', label: 'Bình luận', icon: 'bi-chat-left-text' },
    { key: 'categories', label: 'Danh mục món', icon: 'bi-tags' },
    { key: 'ai-moderation', label: 'Kiểm duyệt AI', icon: 'bi-shield-exclamation' },
    { key: 'ai-monitor', label: 'Giám sát mô hình AI', icon: 'bi-cpu' },
    { key: 'reports', label: 'Báo cáo vi phạm', icon: 'bi-flag' },
  ];

  return (
    <div className="admin-portal-shell py-3">
      <Container fluid className="px-lg-4">
        {/* Thanh tiêu đề Admin Portal */}
        <div className="admin-card mb-3 p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center">
              <div className="admin-header-brand me-3">
                <i className="bi bi-leaf-fill fs-4" />
              </div>
              <div>
                <h5 className="fw-bold mb-0 text-success">Trung Tâm Quản Trị ChayXanh</h5>
                <small className="text-muted">Hệ thống điều hành cộng đồng dinh dưỡng và kiểm duyệt nội dung</small>
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              <div className="text-end d-none d-sm-block">
                <div className="fw-semibold small">{user.full_name}</div>
                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1" style={{ fontSize: '0.72rem' }}>
                  Quản trị viên cấp cao
                </span>
              </div>
              <Link to="/" className="btn btn-outline-success btn-sm rounded-3">
                <i className="bi bi-arrow-left me-1" /> Trang người dùng
              </Link>
            </div>
          </div>
        </div>

        {/* Nội dung chính: Sidebar điều hướng rộng rãi hiển thị 1 dòng + Tab view */}
        <Row className="g-3">
          <Col xs={12} lg={4} xl={3}>
            <div className="admin-card p-2 sticky-top" style={{ top: '1rem' }}>
              <div className="text-muted small fw-bold px-3 py-2 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                Danh mục chức năng
              </div>
              <Nav variant="pills" className="flex-column admin-sidebar-nav" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                {navItems.map((item) => (
                  <Nav.Item key={item.key}>
                    <Nav.Link eventKey={item.key} className="d-flex align-items-center py-2 px-3 small" title={item.label}>
                      <i className={`bi ${item.icon} me-2 fs-6`} />
                      <span className="text-truncate">{item.label}</span>
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
            </div>
          </Col>

          <Col xs={12} lg={8} xl={9}>
            <div className="admin-card p-3 p-md-4 min-vh-75">
              {activeTab === 'dashboard' && <AdminDashboardTab onNavigateTab={(tab) => setActiveTab(tab)} />}
              {activeTab === 'members' && <AdminMembersTab />}
              {activeTab === 'posts' && <AdminPostsTab />}
              {activeTab === 'comments' && <AdminCommentsTab />}
              {activeTab === 'categories' && <AdminCategoriesTab />}
              {activeTab === 'ai-moderation' && <AdminAiModerationTab />}
              {activeTab === 'ai-monitor' && <AdminAiMonitorTab />}
              {activeTab === 'reports' && <AdminReportsTab />}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
