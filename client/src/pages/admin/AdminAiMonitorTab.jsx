// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminAiMonitorTab.jsx
import { useEffect, useState, useCallback } from 'react';
import { Row, Col, Table, Button, Form, Spinner, Alert, ProgressBar } from 'react-bootstrap';
import { adminService } from '../../services/adminService.js';
import AdminAiInterveneModal from './AdminAiInterveneModal.jsx';
import { subscribeSyncEvent } from '../../lib/syncEvents.js';

export default function AdminAiMonitorTab() {
  const [models, setModels] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [showInterveneModal, setShowInterveneModal] = useState(false);
  const [selectedLogForIntervene, setSelectedLogForIntervene] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [modelsRes, logsRes] = await Promise.all([
        adminService.getAiModels(),
        adminService.getAiLogs({ status: statusFilter, action: actionFilter, limit: 30 }),
      ]);
      setModels(modelsRes.data);
      setLogs(logsRes.data);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu giám sát mô hình AI');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, actionFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tự động cập nhật số liệu và nhật ký AI khi có can thiệp hoặc kiểm duyệt
  useEffect(() => {
    const unsubscribe = subscribeSyncEvent(['AI_CHANGED', 'MODERATION_CHANGED'], () => {
      fetchData();
    });
    return unsubscribe;
  }, [fetchData]);

  const handleOpenIntervene = (log = null) => {
    setSelectedLogForIntervene(log);
    setShowInterveneModal(true);
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Giám Sát Mô Hình AI & Nhật Ký Hoạt Động</h4>
          <p className="text-muted small mb-0">Theo dõi trạng thái các mô hình Recommendation, Chatbot Dinh dưỡng và Kiểm duyệt tự động</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="warning" size="sm" className="text-dark rounded-3 fw-semibold px-3" onClick={() => handleOpenIntervene(null)}>
            <i className="bi bi-tools me-1" /> Can thiệp thủ công
          </Button>
          <Button variant="outline-success" size="sm" className="rounded-3 px-3 fw-medium" onClick={fetchData}>
            <i className="bi bi-arrow-clockwise me-1" /> Làm mới
          </Button>
        </div>
      </div>

      {actionMsg && (
        <Alert variant="success" dismissible onClose={() => setActionMsg('')} className="cx-alert-banner py-2 px-3 mb-3">
          <i className="bi bi-check-circle-fill me-2 text-success" />{actionMsg}
        </Alert>
      )}

      {loading ? (
        <div className="admin-card p-4 text-center">
          <Spinner animation="border" variant="success" size="sm" className="me-2" />
          <span className="text-muted small">Đang nạp số liệu giám sát mô hình AI...</span>
        </div>
      ) : error ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center rounded-3">
          <span><i className="bi bi-exclamation-triangle-fill me-2" />{error}</span>
          <Button variant="outline-danger" size="sm" className="rounded-3" onClick={fetchData}>Thử lại</Button>
        </Alert>
      ) : (
        <>
          {/* Trạng thái 3 Mô hình AI */}
          <Row className="g-3 mb-4">
            {models.map((m) => (
              <Col xs={12} md={4} key={m.id}>
                <div className="admin-card kpi-card p-3 h-100">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold mb-0 text-dark">{m.name}</h6>
                    <span className={`cx-badge ${m.status === 'HEALTHY' ? 'cx-badge-active' : 'cx-badge-locked'}`}>
                      {m.status === 'HEALTHY' ? 'Hoạt động tốt' : 'Cảnh báo'}
                    </span>
                  </div>
                  <div className="text-muted small mb-2">{m.type} · <span className="badge bg-light text-secondary border">{m.provider}</span></div>
                  <div className="mb-2">
                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>Độ chuẩn xác</span>
                      <strong className="text-success">{m.successRate}%</strong>
                    </div>
                    <ProgressBar now={m.successRate} variant={m.successRate >= 90 ? 'success' : 'warning'} style={{ height: 6 }} className="rounded-pill" />
                  </div>
                  <div className="d-flex justify-content-between small text-muted border-top pt-2 mt-2">
                    <span>Tổng lượt gọi:</span>
                    <strong className="text-dark">{m.totalCalls.toLocaleString('vi-VN')}</strong>
                  </div>
                </div>
              </Col>
            ))}
          </Row>

          {/* Bảng Logs */}
          <div className="admin-card overflow-hidden">
            <div className="admin-card-header bg-white py-3">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-journal-code text-primary fs-6" />
                  <h6 className="fw-bold mb-0 text-dark">Lịch sử Hoạt động & Nhật ký Phản hồi AI (ai_logs)</h6>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <Form.Select size="sm" className="admin-select-input rounded-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minWidth: 150 }}>
                    <option value="">Tất cả trạng thái</option>
                    <option value="SUCCESS">Thành công (SUCCESS)</option>
                    <option value="ERROR">Gặp lỗi (ERROR)</option>
                    <option value="RESOLVED_BY_ADMIN">Đã can thiệp thủ công</option>
                  </Form.Select>
                  <Form.Select size="sm" className="admin-select-input rounded-3" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={{ minWidth: 160 }}>
                    <option value="">Tất cả tác vụ</option>
                    <option value="SPAM_DETECTION">Kiểm duyệt Spam</option>
                    <option value="CHATBOT_GUEST_QUERY">Tư vấn Chatbot</option>
                    <option value="NUTRIENT_ANALYSIS">Phân tích Dinh dưỡng</option>
                  </Form.Select>
                </div>
              </div>
            </div>
            <div className="p-0">
              {logs.length === 0 ? (
                <div className="text-center py-4 text-muted small">Không tìm thấy bản ghi nhật ký nào</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Mã</th>
                      <th>Mô hình & Tác vụ</th>
                      <th>Trạng thái</th>
                      <th>Phản hồi lỗi / Can thiệp thủ công</th>
                      <th>Thời gian ghi nhận</th>
                      <th className="text-end pe-3">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const actionLabel =
                        log.action === 'SPAM_DETECTION' ? 'Kiểm duyệt Spam' :
                        log.action === 'CHATBOT_GUEST_QUERY' ? 'Chatbot Tư vấn' :
                        log.action === 'NUTRIENT_ANALYSIS' ? 'Phân tích Món ăn' :
                        log.action === 'MODERATION_MANUAL_OVERRIDE' ? 'Duyệt thủ công' : log.action;
                      return (
                        <tr key={log.log_id}>
                          <td className="text-muted fw-semibold small">#{log.log_id}</td>
                          <td>
                            <span className="badge bg-light text-secondary me-2 border">{log.model_name}</span>
                            <span className="small fw-semibold">{actionLabel}</span>
                          </td>
                          <td>
                            <span className={`cx-badge ${
                              log.status === 'SUCCESS' ? 'cx-badge-active' :
                              log.status === 'RESOLVED_BY_ADMIN' ? 'cx-badge-info' : 'cx-badge-danger'
                            }`}>
                              {log.status === 'SUCCESS' ? 'Thành công' : log.status === 'RESOLVED_BY_ADMIN' ? 'Đã can thiệp' : 'Gặp lỗi'}
                            </span>
                          </td>
                          <td>
                            <div className="small text-truncate" style={{ maxWidth: 260 }} title={log.error_feedback}>
                              {log.error_feedback || <span className="text-muted fst-italic">Hoạt động chuẩn xác</span>}
                            </div>
                          </td>
                          <td className="small text-muted">{new Date(log.created_at).toLocaleString('vi-VN')}</td>
                          <td className="text-end pe-3">
                            <Button variant="outline-warning" size="sm" className="admin-action-btn" onClick={() => handleOpenIntervene(log)} title="Can thiệp thủ công kết quả này">
                              <i className="bi bi-pencil-square" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Can thiệp AI */}
      <AdminAiInterveneModal
        show={showInterveneModal}
        onHide={() => setShowInterveneModal(false)}
        defaultLog={selectedLogForIntervene}
        onSuccess={(msg) => {
          setActionMsg(msg);
          fetchData();
        }}
      />
    </div>
  );
}
