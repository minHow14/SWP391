// client/src/features/admin/components/AdminQuickActions.jsx
import { Button, Badge } from 'react-bootstrap';

export default function AdminQuickActions({ onNavigateTab, pendingReports = 0, flaggedItems = 0 }) {
  const actions = [
    { key: 'members', label: 'Thành viên', icon: 'bi-people', badge: null },
    { key: 'posts', label: 'Bài viết & Video', icon: 'bi-journal-richtext', badge: null },
    { key: 'comments', label: 'Bình luận', icon: 'bi-chat-left-text', badge: null },
    { key: 'categories', label: 'Danh mục', icon: 'bi-tags', badge: null },
    {
      key: 'ai-moderation',
      label: 'Kiểm duyệt AI',
      icon: 'bi-shield-exclamation',
      badge: flaggedItems > 0 ? flaggedItems : null,
      badgeVariant: 'warning',
    },
    {
      key: 'reports',
      label: 'Báo cáo vi phạm',
      icon: 'bi-flag',
      badge: pendingReports > 0 ? pendingReports : null,
      badgeVariant: 'danger',
    },
    { key: 'ai-monitor', label: 'Giám sát AI', icon: 'bi-cpu', badge: null },
  ];

  return (
    <div className="admin-card p-3 mb-4">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span className="small fw-bold text-uppercase text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
          <i className="bi bi-lightning-charge-fill text-warning me-1" /> Thao tác quản trị nhanh
        </span>
        <span className="small text-muted" style={{ fontSize: '0.75rem' }}>Chuyển nhanh đến phân hệ cần xử lý</span>
      </div>
      <div className="d-flex flex-wrap gap-2">
        {actions.map((act) => (
          <Button
            key={act.key}
            variant="outline-secondary"
            size="sm"
            className="admin-quick-action-btn rounded-pill d-inline-flex align-items-center gap-1 px-3 py-1 text-dark"
            onClick={() => onNavigateTab(act.key)}
          >
            <i className={`bi ${act.icon} text-success`} />
            <span className="small fw-semibold">{act.label}</span>
            {act.badge && (
              <Badge bg={act.badgeVariant || 'danger'} pill className="ms-1 px-2 py-1" style={{ fontSize: '0.65rem' }}>
                {act.badge}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
