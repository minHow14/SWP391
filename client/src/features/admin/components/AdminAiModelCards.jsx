// D:/SWP391/SWP391/client/src/features/admin/components/AdminAiModelCards.jsx
import { Alert, Badge, Col, Row } from 'react-bootstrap';

const STATUS_PRESENTATION = {
  HEALTHY: { label: 'Hoạt động tốt', background: 'success' },
  DEGRADED: { label: 'Cảnh báo sự cố', background: 'warning' },
  UNKNOWN: { label: 'Chưa có dữ liệu', background: 'secondary' },
};

function ModelCard({ model }) {
  const observed = Number.isFinite(model.totalCalls) && model.totalCalls > 0;
  const status = (observed && STATUS_PRESENTATION[model.status]) || STATUS_PRESENTATION.UNKNOWN;
  const hasRate = observed && ['HEALTHY', 'DEGRADED'].includes(model.status) && Number.isFinite(model.successRate)
    && model.successRate >= 0 && model.successRate <= 100;
  return <Col xs={12} md={4}>
    <div className="admin-card p-3 h-100">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h3 className="h6 fw-bold mb-0 text-dark">{model.name}</h3>
        <Badge bg={status.background} text={status.background === 'warning' ? 'dark' : undefined}>{status.label}</Badge>
      </div>
      <div className="text-muted small mb-3">{model.type} · {model.provider}</div>
      <div className="d-flex flex-wrap justify-content-between gap-2 small text-muted border-top pt-2">
        <span>Tổng lượt gọi: <strong>{model.totalCalls ?? 'Chưa có dữ liệu'}</strong></span>
        <span>Tỷ lệ thành công: <strong>{hasRate ? `${model.successRate}%` : 'Chưa có dữ liệu'}</strong></span>
      </div>
    </div>
  </Col>;
}

export default function AdminAiModelCards({ models }) {
  if (!models.length) return <Alert variant="secondary">Chưa có dữ liệu giám sát mô hình AI.</Alert>;
  return <Row className="g-3 mb-4">{models.map((model) => <ModelCard key={model.id} model={model} />)}</Row>;
}
