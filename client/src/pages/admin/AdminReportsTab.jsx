// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminReportsTab.jsx
import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { adminService } from '../../services/adminService.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../lib/syncEvents.js';

export default function AdminReportsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getReports({ status: statusFilter, limit: 50 });
      setReports(res.data);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách báo cáo vi phạm');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [statusFilter, fetchReports]);

  // Tự động cập nhật danh sách báo cáo khi có thay đổi liên quan
  useEffect(() => {
    const unsubscribe = subscribeSyncEvent(['REPORT_CHANGED', 'POST_CHANGED', 'COMMENT_CHANGED'], () => {
      fetchReports();
    });
    return unsubscribe;
  }, [fetchReports]);

  const handleResolve = async (reportId, resolutionAction) => {
    try {
      await adminService.updateReportStatus(reportId, {
        status: 'RESOLVED',
        resolutionAction,
      });
      setActionMsg(`Đã xử lý báo cáo thành công (${resolutionAction === 'HIDE_CONTENT' ? 'Đã gỡ bỏ nội dung' : 'Đã duyệt'})`);
      emitSyncEvent('REPORT_CHANGED', { reportId });
      if (resolutionAction === 'HIDE_CONTENT') {
        emitSyncEvent('POST_CHANGED');
        emitSyncEvent('COMMENT_CHANGED');
      }
      fetchReports();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDismiss = async (reportId) => {
    try {
      await adminService.updateReportStatus(reportId, { status: 'DISMISSED' });
      setActionMsg('Đã bác bỏ báo cáo vi phạm không chính xác');
      emitSyncEvent('REPORT_CHANGED', { reportId });
      fetchReports();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Quản Lý Báo Cáo Vi Phạm Từ Người Dùng</h4>
          <p className="text-muted small mb-0">Tiếp nhận báo cáo vi phạm bài viết hoặc bình luận, xem xét và xử lý bảo vệ cộng đồng</p>
        </div>
        <Button variant="outline-success" size="sm" className="rounded-3 px-3 fw-medium" onClick={fetchReports}>
          <i className="bi bi-arrow-clockwise me-1" /> Làm mới
        </Button>
      </div>

      {actionMsg && (
        <Alert variant="success" dismissible onClose={() => setActionMsg('')} className="cx-alert-banner py-2 px-3 mb-3">
          <i className="bi bi-check-circle-fill me-2 text-success" />{actionMsg}
        </Alert>
      )}

      {/* Lọc trạng thái */}
      <div className="admin-filter-bar mb-3">
        <Row className="g-2 align-items-center">
          <Col xs={12} sm={6} md={4}>
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted fw-semibold text-nowrap"><i className="bi bi-funnel me-1" />Lọc trạng thái:</span>
              <Form.Select size="sm" className="admin-select-input rounded-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING">Chờ xử lý (PENDING)</option>
                <option value="RESOLVED">Đã giải quyết (RESOLVED)</option>
                <option value="DISMISSED">Đã bác bỏ (DISMISSED)</option>
              </Form.Select>
            </div>
          </Col>
        </Row>
      </div>

      {/* Danh sách báo cáo */}
      {loading ? (
        <div className="admin-card p-4 text-center">
          <Spinner animation="border" variant="success" size="sm" className="me-2" />
          <span className="text-muted small">Đang nạp danh sách báo cáo...</span>
        </div>
      ) : error ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center rounded-3">
          <span><i className="bi bi-exclamation-triangle-fill me-2" />{error}</span>
          <Button variant="outline-danger" size="sm" className="rounded-3" onClick={fetchReports}>Thử lại</Button>
        </Alert>
      ) : reports.length === 0 ? (
        <div className="cx-empty-state">
          <div className="cx-empty-icon">
            <i className="bi bi-shield-check" />
          </div>
          <h5 className="fw-bold mb-1">Không có báo cáo vi phạm nào</h5>
          <p className="text-muted small mb-0">Hàng đợi báo cáo hiện đang trống hoặc không có bản ghi nào khớp với bộ lọc.</p>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <Table responsive hover className="mb-0 align-middle admin-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Mã</th>
                <th>Người gửi báo cáo</th>
                <th>Đối tượng bị phản ánh</th>
                <th>Lý do vi phạm</th>
                <th>Trạng thái</th>
                <th className="text-end pe-3">Hành động xử lý</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((rep) => {
                const isPost = !!rep.post;
                const targetTitle = isPost
                  ? `[Bài viết] ${rep.post.blog?.title || rep.post.video?.title || 'Bài #' + rep.post.post_id}`
                  : `[Bình luận] ${rep.comment?.content}`;

                return (
                  <tr key={rep.report_id}>
                    <td className="text-muted fw-semibold small">#{rep.report_id}</td>
                    <td>
                      <div className="fw-semibold small text-dark">{rep.reporter?.full_name}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{rep.reporter?.email}</div>
                    </td>
                    <td>
                      <div className="small fw-semibold text-truncate d-flex align-items-center gap-1" style={{ maxWidth: 240 }} title={targetTitle}>
                        <i className={`bi ${isPost ? 'bi-file-earmark-text text-primary' : 'bi-chat-left-dots text-secondary'}`} />
                        <span>{targetTitle}</span>
                      </div>
                    </td>
                    <td>
                      <div className="small text-danger text-wrap" style={{ maxWidth: 220 }}>
                        {rep.reason}
                      </div>
                    </td>
                    <td>
                      <span className={`cx-badge ${
                        rep.status === 'PENDING' ? 'cx-badge-locked' :
                        rep.status === 'RESOLVED' ? 'cx-badge-active' : 'cx-badge-neutral'
                      }`}>
                        {rep.status === 'PENDING' ? 'Chờ xử lý' : rep.status === 'RESOLVED' ? 'Đã giải quyết' : 'Đã bác bỏ'}
                      </span>
                    </td>
                    <td className="text-end pe-3">
                      {rep.status === 'PENDING' ? (
                        <div className="d-inline-flex gap-1">
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="rounded-3 fw-medium"
                            onClick={() => handleResolve(rep.report_id, 'HIDE_CONTENT')}
                            title="Xác nhận vi phạm & Gỡ bỏ nội dung"
                          >
                            <i className="bi bi-shield-x me-1" /> Gỡ nội dung
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="rounded-3"
                            onClick={() => handleDismiss(rep.report_id)}
                            title="Bác bỏ báo cáo này"
                          >
                            Bác bỏ
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted small fst-italic">Đã hoàn tất</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
