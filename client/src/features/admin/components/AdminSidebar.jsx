// D:/Projects/FPT/SWP391/client/src/features/admin/components/AdminSidebar.jsx
import { useState, useMemo } from 'react';
import { Nav, Form, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router';

export const ADMIN_NAV_SECTIONS = [
  {
    title: 'Tổng quan & Điều hành',
    items: [
      { key: 'dashboard', label: 'Tổng quan hệ thống', icon: 'bi-grid-1x2', desc: 'KPIs & nhịp thở trực tiếp', badge: 'Live', badgeVariant: 'success' },
      { key: 'reports', label: 'Báo cáo vi phạm', icon: 'bi-flag', desc: 'Xử lý khiếu nại cộng đồng' },
    ],
  },
  {
    title: 'Quản lý cộng đồng',
    items: [
      { key: 'members', label: 'Quản lý thành viên', icon: 'bi-people', desc: 'Tài khoản & phân quyền' },
      { key: 'posts', label: 'Bài viết & Video', icon: 'bi-collection-play', desc: 'Kiểm duyệt & công thức món' },
      { key: 'comments', label: 'Bình luận', icon: 'bi-chat-square-dots', desc: 'Thảo luận người dùng' },
      { key: 'categories', label: 'Danh mục món', icon: 'bi-tags', desc: 'Phân loại ẩm thực thuần chay' },
    ],
  },
  {
    title: 'Trí tuệ nhân tạo (AI Engine)',
    items: [
      { key: 'ai-moderation', label: 'Kiểm duyệt AI', icon: 'bi-shield-check', desc: 'Cảnh báo vi phạm tự động' },
      { key: 'ai-monitor', label: 'Giám sát mô hình AI', icon: 'bi-cpu', desc: 'Độ trễ & telemetry mô hình' },
      { key: 'ai-management', label: 'Quản trị AI', icon: 'bi-sliders2', desc: 'Cấu hình tham số & quota' },
    ],
  },
];

export default function AdminSidebar({ activeTab, onSelectTab, user, isMobileOpen, onCloseMobile }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Lọc nhanh danh sách chức năng theo từ khóa tìm kiếm
  const filteredSections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return ADMIN_NAV_SECTIONS;

    return ADMIN_NAV_SECTIONS.map((section) => {
      const matchedItems = section.items.filter(
        (item) => item.label.toLowerCase().includes(term) || item.desc.toLowerCase().includes(term)
      );
      return { ...section, items: matchedItems };
    }).filter((section) => section.items.length > 0);
  }, [searchTerm]);

  const totalResults = useMemo(() => {
    return filteredSections.reduce((acc, sec) => acc + sec.items.length, 0);
  }, [filteredSections]);

  const handleTabClick = (key) => {
    onSelectTab(key);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside className={`admin-sidebar-wrapper ${isMobileOpen ? 'is-mobile-open' : ''}`}>
      {/* Nút đóng cho màn hình nhỏ */}
      {isMobileOpen && (
        <div className="d-flex d-lg-none justify-content-between align-items-center mb-3 pb-2 border-bottom">
          <span className="fw-semibold text-dark fs-6">Menu Quản trị</span>
          <Button variant="light" size="sm" className="rounded-circle p-1" onClick={onCloseMobile} aria-label="Đóng menu">
            <i className="bi bi-x-lg" />
          </Button>
        </div>
      )}

      {/* Brand Header */}
      <div className="admin-sidebar-brand mb-3 pb-3 border-bottom">
        <div className="d-flex align-items-center gap-3">
          <div className="admin-brand-icon">
            <i className="bi bi-leaf-fill" />
          </div>
          <div className="flex-grow-1 overflow-hidden">
            <div className="d-flex align-items-center gap-2">
              <span className="admin-brand-title">ChayXanh</span>
              <span className="admin-brand-badge">ADMIN</span>
            </div>
            <div className="admin-brand-subtitle text-truncate mt-1.5">Hệ sinh thái ẩm thực chay</div>
          </div>
        </div>
      </div>

      {/* Ô tìm kiếm nhanh tab */}
      <div className="admin-sidebar-search mb-3 pt-1">
        <div className="position-relative">
          <i className="bi bi-search admin-search-icon" />
          <Form.Control
            size="sm"
            type="search"
            className="admin-search-input rounded-2 pe-4"
            placeholder="Tìm nhanh chức năng (Ctrl+K)..."
            aria-label="Tra cứu chức năng quản trị"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="admin-search-clear-btn"
              onClick={() => setSearchTerm('')}
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <i className="bi bi-x-circle-fill" />
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="d-flex justify-content-between align-items-center px-1 mt-2 text-muted" style={{ fontSize: '0.78rem' }}>
            <span>{totalResults} kết quả</span>
            <button type="button" className="btn btn-link p-0 text-decoration-none text-muted" style={{ fontSize: '0.78rem' }} onClick={() => setSearchTerm('')}>
              Đặt lại
            </button>
          </div>
        )}
      </div>

      {/* Danh sách tab theo nhóm */}
      <div className="admin-sidebar-nav-container">
        {filteredSections.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-search d-block mb-2 text-secondary opacity-50 fs-4" />
            <span style={{ fontSize: '0.85rem' }}>Không tìm thấy chức năng phù hợp</span>
            <div className="mt-3">
              <Button variant="outline-success" size="sm" className="rounded-2 px-3 py-1" style={{ fontSize: '0.8rem' }} onClick={() => setSearchTerm('')}>
                Xóa tìm kiếm
              </Button>
            </div>
          </div>
        ) : (
          filteredSections.map((section) => (
            <div key={section.title} className="admin-nav-group mb-3">
              <div className="admin-nav-group-title mb-1">
                {section.title}
              </div>
              <Nav variant="pills" className="flex-column admin-nav-list" activeKey={activeTab}>
                {section.items.map((item) => {
                  const isActive = activeTab === item.key;
                  return (
                    <Nav.Item key={item.key} className="mb-2">
                      <Nav.Link
                        eventKey={item.key}
                        onClick={() => handleTabClick(item.key)}
                        className={`admin-nav-item ${isActive ? 'is-active' : ''}`}
                        title={`${item.label} - ${item.desc}`}
                      >
                        <div className="d-flex align-items-center flex-grow-1 overflow-hidden">
                          <div className={`admin-nav-icon-wrap me-3 ${isActive ? 'is-active' : ''}`}>
                            <i className={`bi ${item.icon}`} />
                          </div>
                          <div className="d-flex flex-column overflow-hidden">
                            <span className="admin-nav-item-label text-truncate">{item.label}</span>
                            <span className="admin-nav-item-desc text-truncate mt-0.5">{item.desc}</span>
                          </div>
                        </div>

                        {item.badge && (
                          <Badge
                            bg={item.badgeVariant || 'success'}
                            pill
                            className="ms-2 px-2 py-0.5 admin-nav-badge"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Nav.Link>
                    </Nav.Item>
                  );
                })}
              </Nav>
            </div>
          ))
        )}
      </div>

      {/* Thẻ Thông tin Quản trị viên (Footer Sidebar) - Margin rộng rãi cách biệt nút bấm */}
      {user && (
        <div className="admin-sidebar-footer pt-3 mt-auto border-top">
          <div className="d-flex align-items-center gap-3 mb-3 p-2.5 rounded-2 admin-user-pill">
            <div className="admin-user-avatar">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="flex-grow-1 overflow-hidden">
              <div className="admin-user-name text-truncate">{user.full_name}</div>
              <div className="admin-user-role text-truncate mt-1">Quản trị viên cấp cao</div>
            </div>
            <span className="admin-status-dot online ms-auto" title="Trực tuyến" />
          </div>

          <Link
            to="/"
            className="btn btn-outline-secondary btn-sm w-100 rounded-2 d-flex align-items-center justify-content-center py-2 admin-site-link"
            title="Mở giao diện người dùng"
          >
            <i className="bi bi-box-arrow-up-right me-2" />
            <span>Trang người dùng</span>
          </Link>
        </div>
      )}
    </aside>
  );
}