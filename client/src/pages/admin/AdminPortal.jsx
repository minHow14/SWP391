// D:/Projects/FPT/SWP391/client/src/pages/admin/AdminPortal.jsx
import { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router';
import { useDatabase } from '../../hooks/useDatabase.js';

import AdminHeader from '../../features/admin/components/AdminHeader.jsx';
import AdminSidebar from '../../features/admin/components/AdminSidebar.jsx';
import AdminDashboardTab from '../../features/admin/components/AdminDashboardTab.jsx';
import AdminMembersTab from '../../features/admin/components/AdminMembersTab.jsx';
import AdminPostsTab from '../../features/admin/components/AdminPostsTab.jsx';
import AdminCommentsTab from '../../features/admin/components/AdminCommentsTab.jsx';
import AdminCategoriesTab from '../../features/admin/components/AdminCategoriesTab.jsx';
import AdminAiModerationTab from '../../features/admin/components/AdminAiModerationTab.jsx';
import AdminAiMonitorTab from '../../features/admin/components/AdminAiMonitorTab.jsx';
import AdminAi from './AdminAi.jsx';
import AdminReportsTab from '../../features/admin/components/AdminReportsTab.jsx';

const VALID_TABS = [
  'dashboard',
  'members',
  'posts',
  'comments',
  'categories',
  'ai-moderation',
  'ai-monitor',
  'ai-management',
  'reports',
];

export default function AdminPortal() {
  const { user } = useDatabase();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
              <div className="text-danger display-4 mb-3">
                <i className="bi bi-shield-lock" />
              </div>
              <h4 className="fw-bold text-danger">Khu vực Giới hạn Quyền Hạn</h4>
              <p className="text-muted small">
                Bạn cần đăng nhập bằng tài khoản có quyền <strong>Quản trị viên (ADMIN)</strong> để truy cập cổng thông tin này.
              </p>
              <div className="d-flex justify-content-center gap-2">
                <Link to="/dang-nhap" className="btn btn-success btn-sm rounded-2">
                  <i className="bi bi-box-arrow-in-right me-1" /> Đến trang Đăng nhập
                </Link>
                <Link to="/" className="btn btn-outline-secondary btn-sm rounded-2">
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
    { key: 'ai-management', label: 'Quản trị AI', icon: 'bi-speedometer2' },
    { key: 'reports', label: 'Báo cáo vi phạm', icon: 'bi-flag' },
  ];

  return (
    <div className="admin-portal-shell py-2.5">
      <Container fluid className="px-lg-4 admin-container-shell">
        {/* Top Header điều hướng toàn trang */}
        <AdminHeader
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onToggleMobile={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        {/* Backdrop cho mobile sidebar */}
        {isMobileSidebarOpen && (
          <div
            className="admin-sidebar-backdrop d-lg-none"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Nội dung chính: Cột Sidebar chuyên nghiệp + Khu vực Tab Content */}
        <Row className="g-2.5">
          <Col xs={12} lg={4} xl={3}>
            <AdminSidebar
              activeTab={activeTab}
              onSelectTab={handleSelectTab}
              user={user}
              isMobileOpen={isMobileSidebarOpen}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />
          </Col>

          <Col xs={12} lg={8} xl={9}>
            <main
              key={activeTab}
              className={
                activeTab === 'dashboard'
                  ? 'admin-dashboard-wrapper admin-tab-content-fade'
                  : 'admin-card p-3 p-lg-3.5 min-vh-75 admin-content-canvas admin-tab-content-fade'
              }
            >
              {activeTab === 'dashboard' && <AdminDashboardTab onNavigateTab={handleSelectTab} />}
              {activeTab === 'members' && <AdminMembersTab />}
              {activeTab === 'posts' && <AdminPostsTab />}
              {activeTab === 'comments' && <AdminCommentsTab />}
              {activeTab === 'categories' && <AdminCategoriesTab />}
              {activeTab === 'ai-moderation' && <AdminAiModerationTab />}
              {activeTab === 'ai-monitor' && <AdminAiMonitorTab />}
              {activeTab === 'ai-management' && <AdminAi />}
              {activeTab === 'reports' && <AdminReportsTab />}
            </main>
          </Col>
        </Row>
      </Container>
    </div>
  );
}