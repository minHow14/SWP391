// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminPortal.jsx
import { useState, useEffect } from 'react';
import { Container, Row, Col, Nav, Alert } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router';
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

const VALID_TABS = ['dashboard', 'members', 'posts', 'comments', 'categories', 'ai-moderation', 'ai-monitor', 'reports'];

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Tổng quan hệ thống', icon: 'bi-speedometer2' },
  { key: 'members', label: 'Quản lý thành viên', icon: 'bi-people' },
  { key: 'posts', label: 'Bài viết & Video', icon: 'bi-journal-richtext' },
  { key: 'comments', label: 'Bình luận', icon: 'bi-chat-left-text' },
  { key: 'categories', label: 'Quản lý danh mục', icon: 'bi-tags' },
  { key: 'ai-moderation', label: 'Kiểm duyệt AI', icon: 'bi-shield-exclamation' },
  { key: 'ai-monitor', label: 'Giám sát mô hình AI', icon: 'bi-cpu' },
  { key: 'reports', label: 'Báo cáo vi phạm', icon: 'bi-flag' },
];

export default function AdminPortal() {
  const { user } = useDatabase();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam)) return tabParam;
    try {
      const savedTab = sessionStorage.getItem('admin_active_tab');
      if (savedTab && VALID_TABS.includes(savedTab)) return savedTab;
    } catch {
      // Bỏ qua lỗi sessionStorage nếu bị chặn
    }
    return 'dashboard';
  });

  const handleSelectTab = (selectedKey) => {
    if (!selectedKey || !VALID_TABS.includes(selectedKey)) return;
    setActiveTab(selectedKey);
    setSearchParams({ tab: selectedKey }, { replace: true });
    try {
      sessionStorage.setItem('admin_active_tab', selectedKey);
    } catch {
      // Bỏ qua lỗi sessionStorage nếu bị chặn
    }
  };

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

  if (!user || user.role !== 1) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col xs={12} md={8} lg={5}>
            <div className="admin-card text-center p-4 p-md-5">
              <div className="cx-empty-icon danger mx-auto mb-3">
                <i className="bi bi-shield-lock-fill" />
              </div>
              <h4 className="fw-bold text-danger mb-2">Khu Vực Giới Hạn Quyền Hạn</h4>
              <p className="text-muted small mb-4">
                Bạn cần đăng nhập bằng tài khoản có quyền <strong>Quản trị viên (ADMIN)</strong> để truy cập cổng thông tin này.
              </p>
              <Alert variant="success" className="text-start small bg-success-subtle border-0 rounded-3 mb-4">
                <div className="fw-bold mb-1"><i className="bi bi-key-fill me-1" /> Tài khoản Quản trị viên hệ thống:</div>
                <div>Email: <code>admin@swp391.com</code></div>
                <div>Mật khẩu: <code>123456</code></div>
              </Alert>
              <div className="d-flex justify-content-center gap-2">
                <Link to="/dang-nhap" className="btn btn-success btn-sm rounded-3 px-3">
                  <i className="bi bi-box-arrow-in-right me-1" /> Đến trang Đăng nhập
                </Link>
                <Link to="/" className="btn btn-outline-secondary btn-sm rounded-3 px-3">
                  Quay về Trang chủ
                </Link>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  const activeTabMeta = NAV_ITEMS.find((item) => item.key === activeTab) || NAV_ITEMS[0];

  return (
    <div className="admin-portal-shell py-3">
      <Container fluid className="px-lg-4">
        {/* Top Header Card */}
        <div className="admin-card mb-3 p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center">
              <div className="admin-header-brand me-3">
                <i className="bi bi-leaf-fill fs-4" />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h5 className="fw-bold mb-0 text-success">Trung Tâm Quản Trị ChayXanh</h5>
                  <span className="cx-badge cx-badge-active d-none d-sm-inline-flex">Online</span>
                </div>
                <small className="text-muted">Hệ thống điều hành cộng đồng dinh dưỡng và kiểm duyệt nội dung</small>
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2 text-end d-none d-md-flex">
                <div className="cx-user-avatar">
                  {user.full_name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div className="text-start">
                  <div className="fw-semibold small lh-1">{user.full_name}</div>
                  <span className="badge bg-success-subtle text-success border border-success-subtle mt-1" style={{ fontSize: '0.7rem' }}>
                    Quản trị viên cấp cao
                  </span>
                </div>
              </div>
              <Link to="/" className="btn btn-outline-success btn-sm rounded-3 px-3">
                <i className="bi bi-box-arrow-up-right me-1" /> Trang người dùng
              </Link>
            </div>
          </div>
        </div>

        {/* Layout: Sidebar + Main Content */}
        <Row className="g-3">
          <Col xs={12} lg={4} xl={3}>
            <div className="admin-card p-2 sticky-top admin-mobile-nav-container" style={{ top: '1rem', zIndex: 10 }}>
              <div className="d-none d-lg-block text-muted small fw-bold px-3 py-2 text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>
                Danh mục chức năng
              </div>
              <Nav variant="pills" className="flex-column admin-sidebar-nav" activeKey={activeTab} onSelect={handleSelectTab}>
                {NAV_ITEMS.map((item) => (
                  <Nav.Item key={item.key}>
                    <Nav.Link eventKey={item.key} className="py-2 px-3" title={item.label}>
                      <i className={`bi ${item.icon} me-2`} />
                      <span className="text-truncate">{item.label}</span>
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
            </div>
          </Col>

          <Col xs={12} lg={8} xl={9}>
            <div className="admin-card p-3 p-md-4 min-vh-75">
              <div className="d-lg-none mb-3 pb-2 border-bottom d-flex align-items-center text-success">
                <i className={`bi ${activeTabMeta.icon} me-2 fs-5`} />
                <span className="fw-bold">{activeTabMeta.label}</span>
              </div>
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
