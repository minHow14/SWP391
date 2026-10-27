// client/src/features/admin/components/AdminKpiCard.jsx
import { ProgressBar, Badge } from 'react-bootstrap';

export default function AdminKpiCard({
  title,
  value,
  subtext,
  icon,
  colorClass = 'green',
  progressPercent = null,
  progressVariant = 'success',
  badgeText = null,
  badgeVariant = 'success',
  onClick = null,
}) {
  const isClickable = typeof onClick === 'function';

  return (
    <div
      className={`admin-card p-3 h-100 ${isClickable ? 'kpi-card-clickable' : ''}`}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="d-flex justify-content-between align-items-start mb-2">
        <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
          {title}
        </span>
        <div className={`kpi-icon-badge kpi-${colorClass}`}>
          <i className={`bi ${icon}`} />
        </div>
      </div>

      <div className="d-flex align-items-baseline gap-2 mb-1">
        <h3 className="fw-bold mb-0 text-dark">{value}</h3>
        {badgeText && (
          <Badge bg={badgeVariant} className="rounded-pill px-2 py-1 fw-normal" style={{ fontSize: '0.7rem' }}>
            {badgeText}
          </Badge>
        )}
      </div>

      {subtext && <div className="small text-muted mb-2">{subtext}</div>}

      {progressPercent !== null && (
        <div className="mt-2">
          <ProgressBar
            now={progressPercent}
            variant={progressVariant}
            style={{ height: 6, borderRadius: 3 }}
          />
        </div>
      )}

      {isClickable && (
        <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center text-success small fw-semibold">
          <span>Xem chi tiết</span>
          <i className="bi bi-chevron-right small" />
        </div>
      )}
    </div>
  );
}
