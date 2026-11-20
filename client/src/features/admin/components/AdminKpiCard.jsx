// client/src/features/admin/components/AdminKpiCard.jsx
// Thẻ chỉ số KPI trên dashboard: tiêu đề, giá trị, badge, thanh tiến độ và điều hướng khi bấm.
import { ProgressBar, Badge } from 'react-bootstrap';

/**
 * Thẻ KPI.
 * @param {object} props
 * @param {string} props.title Tên chỉ số.
 * @param {string|number} props.value Giá trị hiển thị chính.
 * @param {string} [props.subtext] Dòng mô tả phụ.
 * @param {string} props.icon Lớp icon Bootstrap Icons (vd. `bi-people-fill`).
 * @param {string} [props.colorClass] Biến thể màu của icon (green, blue, amber, rose).
 * @param {number|null} [props.progressPercent] Phần trăm thanh tiến độ; null thì ẩn thanh.
 * @param {Function|null} [props.onClick] Khi có thì thẻ trở thành nút bấm truy cập phân hệ.
 */
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
  // Khi thẻ bấm được thì gán role/tabIndex/Enter để người dùng bàn phím cũng truy cập được.
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
