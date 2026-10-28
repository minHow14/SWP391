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
    <div className="cx-action-launchpad mb-4 p-3">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span className="cx-eyebrow text-muted">
          <i className="bi bi-lightning-charge-fill text-warning me-1" />
          Phím tắt điều hành nhanh
        </span>
        <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
          Chuyển đổi trực tiếp giữa các module nghiệp vụ
        </span>
      </div>
      <div className="d-flex flex-wrap gap-2">
        {actions.map((act) => (
          <Button
            key={act.key}
            variant="light"
            size="sm"
            className="cx-action-chip rounded-pill d-inline-flex align-items-center gap-2 px-3 py-1"
            onClick={() => onNavigateTab(act.key)}
          >
            <i className={`bi ${act.icon} cx-action-chip-icon`} />
            <span className="cx-action-chip-label">{act.label}</span>
            {act.badge && (
              <Badge
                bg={act.badgeVariant || 'danger'}
                pill
                className="ms-1 px-2 py-1 cx-action-chip-badge"
              >
                {act.badge}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
