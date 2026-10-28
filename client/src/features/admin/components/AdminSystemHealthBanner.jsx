// client/src/features/admin/components/AdminSystemHealthBanner.jsx
import { Row, Col } from 'react-bootstrap';

export default function AdminSystemHealthBanner() {
  const telemetryNodes = [
    {
      label: 'Cơ sở dữ liệu',
      value: 'PostgreSQL 15+ (Prisma ORM)',
      status: 'online',
      icon: 'bi-database-check',
    },
    {
      label: 'AI Microservice',
      value: 'FastAPI (DeepSeek Engine)',
      status: 'online',
      icon: 'bi-cpu',
    },
    {
      label: 'Lưu trữ nhật ký',
      value: 'Tự động dọn dẹp sau 30 ngày',
      status: 'active',
      icon: 'bi-clock-history',
    },
    {
      label: 'Đồng bộ liên kênh',
      value: 'Event Bus (WebSocket / Sync)',
      status: 'online',
      icon: 'bi-broadcast-pin',
    },
  ];

  return (
    <div className="cx-health-banner p-3 mt-4">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span className="cx-eyebrow text-muted">
          <i className="bi bi-hdd-network me-1 text-success" />
          Hạ tầng kỹ thuật & Kết nối dịch vụ
        </span>
        <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
          Tất cả dịch vụ hoạt động bình thường
        </span>
      </div>

      <Row className="g-2 g-md-3">
        {telemetryNodes.map((node) => (
          <Col xs={12} sm={6} lg={3} key={node.label}>
            <div className="cx-health-node d-flex align-items-center gap-2 p-2">
              <span className={`cx-pulse-dot is-${node.status}`} />
              <div className="overflow-hidden">
                <div className="cx-health-label text-muted">{node.label}</div>
                <div className="cx-health-val text-dark text-truncate" title={node.value}>
                  {node.value}
                </div>
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
}
