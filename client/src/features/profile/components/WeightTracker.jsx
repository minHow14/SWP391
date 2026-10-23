// client/src/features/profile/components/WeightTracker.jsx
import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Form, Alert, Spinner, Badge, Card, Row, Col } from 'react-bootstrap';
import { authService } from '../../../services/authService.js';

function getBmiBadge(bmi) {
  if (!bmi || bmi <= 0) {
    return <Badge bg="secondary">Chưa đủ dữ liệu</Badge>;
  }
  if (bmi < 18.5) {
    return <Badge bg="info">Thiếu cân</Badge>;
  }
  if (bmi < 24.9) {
    return <Badge bg="success">Bình thường</Badge>;
  }
  if (bmi < 29.9) {
    return <Badge bg="warning" text="dark">Tiền béo phì</Badge>;
  }
  return <Badge bg="danger">Béo phì</Badge>;
}

export default function WeightTracker({ height, currentWeight, onWeightRecorded }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authService.getHealthHistory({ limit: 20 });
      const rawList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.history)
        ? response.data.history
        : Array.isArray(response)
        ? response
        : [];
      setHistory(rawList);
    } catch (err) {
      setError(err.message || 'Không thể tải lịch sử cân nặng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRecord = async (e) => {
    e.preventDefault();
    const weightNum = parseFloat(newWeight);
    if (isNaN(weightNum) || weightNum < 20 || weightNum > 350) {
      setSubmitError('Cân nặng phải là số từ 20 đến 350 kg.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');
    try {
      const res = await authService.recordWeight({ weight: weightNum });
      setSubmitSuccess(`Đã ghi nhận ${weightNum} kg thành công!`);
      setNewWeight('');
      if (onWeightRecorded) {
        onWeightRecorded(weightNum, res?.record?.bmi || res?.data?.record?.bmi || res?.data?.bmi);
      }
      await loadHistory();
    } catch (err) {
      setSubmitError(err.message || 'Lỗi khi ghi nhận cân nặng.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasHistory = Array.isArray(history) && history.length > 0;

  return (
    <section className="cx-profile-section mt-4">
      <div className="cx-profile-section-heading mb-3">
        <div>
          <h2 className="mb-1">
            <i className="bi bi-activity text-success me-2" aria-hidden="true" />
            Theo dõi Cân nặng & Lịch sử Sức khỏe
          </h2>
          <p className="text-muted small mb-0">
            Ghi nhận cân nặng thường xuyên giúp tính toán chuẩn xác chỉ số BMI và lộ trình dinh dưỡng.
          </p>
        </div>
        {height && (
          <span className="badge bg-light text-dark border p-2">
            Chiều cao: <strong>{height} cm</strong>
          </span>
        )}
      </div>

      <Card className="border-0 bg-light p-3 mb-4 rounded-3 shadow-none">
        <Form onSubmit={handleRecord}>
          <Row className="g-2 align-items-center">
            <Col xs={12} sm="auto">
              <Form.Label htmlFor="weight-input" className="mb-0 fw-semibold text-secondary small">
                Ghi nhận cân nặng hôm nay:
              </Form.Label>
            </Col>
            <Col xs={8} sm={4} md={3}>
              <Form.Control
                id="weight-input"
                type="number"
                step="0.1"
                min="20"
                max="350"
                placeholder={currentWeight ? `Hiện tại: ${currentWeight} kg` : 'Ví dụ: 62.5'}
                value={newWeight}
                onChange={(e) => {
                  setNewWeight(e.target.value);
                  setSubmitError('');
                }}
                disabled={submitting}
                required
              />
            </Col>
            <Col xs={4} sm="auto">
              <Button type="submit" variant="success" disabled={submitting || !newWeight} className="w-100">
                {submitting ? (
                  <Spinner animation="border" size="sm" aria-hidden="true" />
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-1" aria-hidden="true" /> Ghi nhận
                  </>
                )}
              </Button>
            </Col>
          </Row>
        </Form>

        {submitError && (
          <Alert variant="danger" className="mt-2 py-2 small mb-0" dismissible onClose={() => setSubmitError('')}>
            {submitError}
          </Alert>
        )}
        {submitSuccess && (
          <Alert variant="success" className="mt-2 py-2 small mb-0" dismissible onClose={() => setSubmitSuccess('')}>
            {submitSuccess}
          </Alert>
        )}
      </Card>

      {/* 4 Trạng thái hiển thị danh sách */}
      {loading && !hasHistory ? (
        <div className="text-center py-4 text-muted">
          <Spinner animation="border" variant="success" size="sm" className="me-2" />
          <span>Đang tải lịch sử sức khỏe...</span>
        </div>
      ) : error ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <Button variant="outline-danger" size="sm" onClick={loadHistory}>
            Thử lại
          </Button>
        </Alert>
      ) : !hasHistory ? (
        <Alert variant="light" className="text-center py-4 border rounded-3 text-muted">
          <i className="bi bi-clock-history fs-3 d-block text-secondary mb-2" aria-hidden="true" />
          Chưa có dữ liệu ghi nhận cân nặng nào trước đây.
        </Alert>
      ) : (
        <div className="table-responsive rounded-3 border">
          <Table hover className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th scope="col" className="text-secondary small fw-semibold">Thời điểm ghi nhận</th>
                <th scope="col" className="text-secondary small fw-semibold text-center">Cân nặng (kg)</th>
                <th scope="col" className="text-secondary small fw-semibold text-center">Chỉ số BMI</th>
                <th scope="col" className="text-secondary small fw-semibold text-center">Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => {
                const dateStr = record.recorded_at
                  ? new Date(record.recorded_at).toLocaleString('vi-VN', {
                      timeZone: 'Asia/Bangkok',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A';
                return (
                  <tr key={record.history_id}>
                    <td className="small">{dateStr}</td>
                    <td className="text-center fw-bold text-dark">{record.weight} kg</td>
                    <td className="text-center fw-semibold text-success">
                      {record.bmi ? Number(record.bmi).toFixed(1) : '-'}
                    </td>
                    <td className="text-center">{getBmiBadge(record.bmi)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </section>
  );
}
