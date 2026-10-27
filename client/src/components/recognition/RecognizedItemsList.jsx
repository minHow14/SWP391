// client/src/components/recognition/RecognizedItemsList.jsx
import { Card, Badge, ProgressBar, Row, Col, Alert } from 'react-bootstrap';

const FRESHNESS_CONFIG = {
  FRESH: { label: 'Tươi mới', variant: 'success', icon: 'bi-check-circle-fill' },
  GOOD: { label: 'Dùng tốt', variant: 'primary', icon: 'bi-shield-check' },
  EXPIRING_SOON: { label: 'Cần dùng sớm', variant: 'warning', icon: 'bi-exclamation-circle-fill' },
  SPOILED: { label: 'Có dấu hiệu hỏng', variant: 'danger', icon: 'bi-x-circle-fill' },
};

export default function RecognizedItemsList({ items = [] }) {
  if (!items || items.length === 0) {
    return (
      <Alert variant="info" className="text-center my-3">
        <i className="bi bi-info-circle me-2" aria-hidden="true" />
        Chưa có nguyên liệu nào được nhận diện từ ảnh. Hãy thử chụp ảnh góc rộng và đủ ánh sáng hơn.
      </Alert>
    );
  }

  const expiringCount = items.filter((i) => i.freshnessStatus === 'EXPIRING_SOON').length;

  return (
    <div className="mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="fw-bold mb-0">
          <i className="bi bi-basket2-fill text-success me-2" aria-hidden="true" />
          Nguyên Liệu Phát Hiện Được ({items.length})
        </h5>
        {expiringCount > 0 && (
          <Badge bg="warning" text="dark" className="px-2 py-1">
            <i className="bi bi-clock-history me-1" aria-hidden="true" />
            {expiringCount} loại cần nấu sớm
          </Badge>
        )}
      </div>

      <Row className="g-3">
        {items.map((item, idx) => {
          const config = FRESHNESS_CONFIG[item.freshnessStatus] || FRESHNESS_CONFIG.GOOD;

          return (
            <Col xs={12} md={6} key={item.id || idx}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="fw-bold mb-0 text-dark">{item.detectedName}</h6>
                      {item.matchedCatalogName && item.matchedCatalogName !== item.detectedName && (
                        <small className="text-muted">
                          Khớp với: <span className="fw-semibold text-secondary">{item.matchedCatalogName}</span>
                        </small>
                      )}
                    </div>
                    <Badge bg={config.variant} className="d-flex align-items-center gap-1">
                      <i className={`bi ${config.icon}`} aria-hidden="true" />
                      {config.label}
                    </Badge>
                  </div>

                  <div className="mb-2">
                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>Độ tươi:</span>
                      <span className="fw-semibold">{item.freshnessScore}/100</span>
                    </div>
                    <ProgressBar
                      variant={config.variant}
                      now={item.freshnessScore}
                      style={{ height: '6px' }}
                      aria-label={`Điểm độ tươi của ${item.detectedName}: ${item.freshnessScore}%`}
                    />
                  </div>

                  <div className="small text-muted mb-2">
                    {item.quantityEstimate && (
                      <span className="me-3">
                        <i className="bi bi-box-seam me-1" aria-hidden="true" />
                        {item.quantityEstimate}
                      </span>
                    )}
                    {item.estimatedShelfLifeDays !== null && (
                      <span>
                        <i className="bi bi-hourglass-split me-1" aria-hidden="true" />
                        Còn khoảng {item.estimatedShelfLifeDays} ngày
                      </span>
                    )}
                  </div>

                  {item.spoilageSigns && item.spoilageSigns.length > 0 && (
                    <div className="bg-light p-2 rounded small mb-2 text-danger">
                      <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
                      <strong>Dấu hiệu:</strong> {item.spoilageSigns.join(', ')}
                    </div>
                  )}

                  {item.storageAdvice && (
                    <div className="bg-light p-2 rounded small text-secondary">
                      <i className="bi bi-lightbulb-fill text-warning me-1" aria-hidden="true" />
                      <strong>Mẹo bảo quản:</strong> {item.storageAdvice}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
