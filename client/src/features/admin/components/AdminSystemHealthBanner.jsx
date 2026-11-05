// D:/SWP391/SWP391/client/src/features/admin/components/AdminSystemHealthBanner.jsx
import { Alert, Button, Col, Row, Spinner } from 'react-bootstrap';
import { useSystemHealth } from '../hooks/useSystemHealth.js';

const SERVICES = [{ id: 'database', label: 'Cơ sở dữ liệu' }, { id: 'aiService', label: 'Dịch vụ AI' }];
const STATUS_LABELS = { UP: 'Kết nối được', DOWN: 'Không kết nối được', UNKNOWN: 'Chưa xác định' };

function healthSummary(nodes) {
  if (nodes.some((node) => node.status === 'DOWN')) return 'Có dịch vụ chưa kết nối được';
  if (nodes.every((node) => node.status === 'UP')) return 'Tất cả kết nối đều sẵn sàng';
  return 'Chưa xác định đầy đủ trạng thái kết nối';
}

function HealthResults({ data }) {
  if (!data.services.length) return <Alert variant="secondary" className="mb-0">Chưa có kết quả kiểm tra kết nối.</Alert>;
  const nodes = SERVICES.map((service) => {
    const measured = data.services.find((item) => item?.id === service.id)?.status;
    return { ...service, status: measured === 'UP' || measured === 'DOWN' ? measured : 'UNKNOWN' };
  });
  return <>
    <p className="small fw-semibold mb-2" role="status">{healthSummary(nodes)}</p>
    <Row className="g-2 g-md-3">
      {nodes.map((node) => <Col xs={12} sm={6} key={node.id}>
        <div className="cx-health-node d-flex align-items-center gap-2 p-2" role="group" aria-label={node.label}>
          <span className={`cx-pulse-dot is-${node.status.toLowerCase()}`} aria-hidden="true" />
          <div><div className="cx-health-label text-muted">{node.label}</div>
            <div className="cx-health-val">{STATUS_LABELS[node.status]}</div></div>
        </div>
      </Col>)}
    </Row>
    <p className="small text-muted mb-0 mt-2">
      Kiểm tra lúc {new Date(data.checkedAt).toLocaleTimeString('vi-VN')}. Kết nối AI chưa xác nhận khả năng xử lý yêu cầu.
    </p>
  </>;
}

export default function AdminSystemHealthBanner() {
  const { data, loading, error, refresh } = useSystemHealth();
  return <section className="cx-health-banner p-3 mt-4" aria-label="Kết nối dịch vụ" aria-busy={loading}>
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <h2 className="h6 mb-0"><i className="bi bi-hdd-network me-2" aria-hidden="true" />Kết nối dịch vụ</h2>
      <Button variant="outline-secondary" size="sm" onClick={refresh} disabled={loading}>
        {loading && <Spinner size="sm" className="me-2" aria-hidden="true" />}Kiểm tra lại
      </Button>
    </div>
    {loading && <p className="small text-muted mb-0" role="status">Đang kiểm tra kết nối…</p>}
    {!loading && error && <Alert variant="danger" className="mb-0">{error}</Alert>}
    {!loading && !error && data && <HealthResults data={data} />}
  </section>;
}
