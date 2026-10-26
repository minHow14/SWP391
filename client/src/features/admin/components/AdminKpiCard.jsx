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
      className={`cx-metric-card h-100 ${isClickable ? 'is-clickable' : ''}`}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="d-flex justify-content-between align-items-start mb-2">
        <span className="cx-metric-label">{title}</span>
        <div className={`cx-metric-icon cx-metric-icon-${colorClass}`}>
          <i className={`bi ${icon}`} />
        </div>
      </div>

      <div className="d-flex align-items-baseline gap-2 mb-1">
        <span className="cx-metric-number">{value}</span>
        {badgeText && (
          <Badge bg={badgeVariant} className="rounded-pill px-2 py-1 fw-normal cx-metric-badge">
            {badgeText}
          </Badge>
        )}
      </div>

      {subtext && <div className="cx-metric-subtext">{subtext}</div>}

      {progressPercent !== null && (
        <div className="mt-2 pt-1">
          <ProgressBar
            now={progressPercent}
            variant={progressVariant}
            className="cx-metric-progress"
          />
        </div>
      )}

      {isClickable && (
        <div className="cx-metric-footer mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
          <span className="small fw-semibold">Truy cập phân hệ</span>
          <i className="bi bi-arrow-right-short fs-5" />
        </div>
      )}
    </div>
  );
}
