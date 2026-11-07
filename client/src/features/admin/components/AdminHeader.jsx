// D:/Projects/FPT/SWP391/client/src/features/admin/components/AdminHeader.jsx
import { useEffect, useState, useMemo } from 'react';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router';
import { ADMIN_NAV_SECTIONS } from './AdminSidebar.jsx';
import { emitSyncEvent } from '../../../utils/syncEvents.js';

export default function AdminHeader({ activeTab, onSelectTab, onToggleMobile }) {
  const [timeString, setTimeString] = useState('');

  // Cập nhật đồng hồ thời gian thực
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        new Intl.DateTimeFormat('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(now)
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Tìm thông tin mục tab hiện tại và nhóm cha
  const activeTabInfo = useMemo(() => {
    for (const section of ADMIN_NAV_SECTIONS) {
      const found = section.items.find((item) => item.key === activeTab);
      if (found) {
        return { sectionTitle: section.title, item: found };
      }
    }
    return {
      sectionTitle: 'Hệ thống',
      item: { key: activeTab, label: 'Bảng điều khiển', icon: 'bi-grid', desc: '' },
    };
  }, [activeTab]);

  const handleGlobalRefresh = () => {
    emitSyncEvent('*');
  };

  return (
    <header className="admin-header-bar mb-3 px-3 py-2">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        {/* Bên trái: Nút mở menu mobile + Breadcrumbs */}
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="light"
            size="sm"
            className="d-lg-none admin-mobile-toggle-btn rounded-2 p-1"
            onClick={onToggleMobile}
            aria-label="Mở danh mục quản trị"
          >
            <i className="bi bi-list fs-5" />
          </Button>

          <nav aria-label="Đường dẫn điều hướng quản trị" className="admin-breadcrumb-nav">
            <div className="d-flex align-items-center flex-wrap">
              <span className="admin-breadcrumb-root d-flex align-items-center text-muted">
                <i className="bi bi-shield-check text-success fs-6 me-2" />
                <span>Admin</span>
              </span>
              <i className="bi bi-chevron-right admin-breadcrumb-divider mx-2.5" />
              <span className="admin-breadcrumb-section text-muted">
                {activeTabInfo.sectionTitle}
              </span>
              <i className="bi bi-chevron-right admin-breadcrumb-divider mx-2.5" />
              <span className="admin-breadcrumb-active fw-semibold text-dark d-inline-flex align-items-center">
                <i className={`bi ${activeTabInfo.item.icon} text-success me-2.5 fs-6`} />
                <span>{activeTabInfo.item.label}</span>
              </span>
            </div>
          </nav>
        </div>

        {/* Bên phải: Trạng thái hệ thống + Đồng hồ + Phím tắt nhanh */}
        <div className="d-flex align-items-center gap-3 flex-wrap">
          {/* Nhãn trạng thái hệ sinh thái */}
          <div className="admin-status-badge d-none d-sm-flex align-items-center px-3 py-1.5 rounded-pill me-2">
            <span className="admin-live-dot me-2" />
            <span className="admin-status-text">Trực tuyến</span>
            <span className="admin-clock-text text-muted ps-2 ms-2 border-start">{timeString}</span>
          </div>

          {/* Phím tắt thao tác nhanh - Khoảng cách thoáng đãng và có margin rõ rệt */}
          <div className="d-flex align-items-center gap-2.5 admin-header-actions-group">
            <Button
              variant="light"
              size="sm"
              className="rounded-2 d-inline-flex align-items-center admin-header-btn"
              onClick={handleGlobalRefresh}
              title="Đồng bộ hóa dữ liệu toàn hệ thống"
            >
              <i className="bi bi-arrow-clockwise me-1.5" />
              <span className="d-none d-md-inline">Đồng bộ</span>
            </Button>

            {activeTab !== 'reports' && (
              <Button
                variant="light"
                size="sm"
                className="rounded-2 d-none d-xl-inline-flex align-items-center admin-header-btn text-danger"
                onClick={() => onSelectTab('reports')}
                title="Xem xét báo cáo vi phạm"
              >
                <i className="bi bi-flag me-1.5" />
                <span>Báo cáo</span>
              </Button>
            )}

            {activeTab !== 'ai-moderation' && (
              <Button
                variant="light"
                size="sm"
                className="rounded-2 d-none d-xl-inline-flex align-items-center admin-header-btn text-warning-emphasis"
                onClick={() => onSelectTab('ai-moderation')}
                title="Kiểm duyệt nội dung tự động"
              >
                <i className="bi bi-shield-check me-1.5" />
                <span>Duyệt AI</span>
              </Button>
            )}

            <Link
              to="/"
              className="btn btn-success btn-sm rounded-2 d-inline-flex align-items-center px-3.5 admin-header-action"
            >
              <i className="bi bi-house-door me-1.5" />
              <span className="d-none d-sm-inline">Website</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}