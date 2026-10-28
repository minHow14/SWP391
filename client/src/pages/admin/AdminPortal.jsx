// client/src/pages/admin/AdminPortal.jsx
import { useState, useEffect } from 'react';
import { Container, Row, Col, Nav, Alert } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router';
import { useDatabase } from '../../hooks/useDatabase.js';

import AdminDashboardTab from '../../features/admin/components/AdminDashboardTab.jsx';
import AdminMembersTab from '../../features/admin/components/AdminMembersTab.jsx';
import AdminPostsTab from '../../features/admin/components/AdminPostsTab.jsx';
import AdminCommentsTab from '../../features/admin/components/AdminCommentsTab.jsx';
import AdminCategoriesTab from '../../features/admin/components/AdminCategoriesTab.jsx';
import AdminAiModerationTab from '../../features/admin/components/AdminAiModerationTab.jsx';
import AdminAiMonitorTab from '../../features/admin/components/AdminAiMonitorTab.jsx';
import AdminReportsTab from '../../features/admin/components/AdminReportsTab.jsx';

const VALID_TABS = ['dashboard', 'members', 'posts', 'comments', 'categories', 'ai-moderation', 'ai-monitor', 'reports'];

export default function AdminPortal() {
  const { user } = useDatabase();
  const [searchParams, setSearchParams] = useSearchParams();

  // Khởi tạo tab hiện tại: ưu tiên query param (?tab=...), sau đó đến sessionStorage, mặc định là 'dashboard'
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam)) return tabParam;
    try {
      const savedTab = sessionStorage.getItem('admin_active_tab');
      if (savedTab && VALID_TABS.includes(savedTab)) return savedTab;
    } catch {
      // Bỏ qua lỗi nếu sessionStorage bị chặn
    }
    return 'dashboard';
  });

  // Chuyển tab và lưu trạng thái vào URL và sessionStorage
  const handleSelectTab = (selectedKey) => {
    if (!selectedKey || !VALID_TABS.includes(selectedKey)) return;
    setActiveTab(selectedKey);
    setSearchParams({ tab: selectedKey }, { replace: true });
    try {
      sessionStorage.setItem('admin_active_tab', selectedKey);
    } catch {
      // Bỏ qua lỗi nếu sessionStorage bị chặn
    }
  };

  // Đồng bộ hóa URL khi mở lại hoặc ấn back/forward trên trình duyệt
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
      try {
        sessionStorage.setItem('admin_active_tab', tabParam);
      } catch {
        /* Bỏ qua lỗi khi storage bị chặn */
      }
    } else if (!tabParam && activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [searchParams, activeTab, setSearchParams]);

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
              <Nav variant="pills" className="flex-column admin-sidebar-nav" activeKey={activeTab} onSelect={handleSelectTab}>
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
            <div className={activeTab === 'dashboard' ? 'admin-dashboard-wrapper' : 'admin-card p-3 p-md-4 min-vh-75'}>
              {activeTab === 'dashboard' && <AdminDashboardTab onNavigateTab={handleSelectTab} />}
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
