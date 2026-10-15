// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminReportsTab.jsx
import { useEffect, useState } from 'react';
import { Table, Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { adminService } from '../../services/adminService.js';
import { emitSyncEvent, subscribeSyncEvent } from '../../lib/syncEvents.js';

export default function AdminReportsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchReports = async () => {
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
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  // Tự động cập nhật danh sách báo cáo khi có thay đổi liên quan
  useEffect(() => {
    const unsubscribe = subscribeSyncEvent(['REPORT_CHANGED', 'POST_CHANGED', 'COMMENT_CHANGED'], () => {
      fetchReports();
    });
    return unsubscribe;
  }, [statusFilter]);

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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Quản Lý Báo Cáo Vi Phạm Từ Người Dùng</h4>
          <p className="text-muted small mb-0">Tiếp nhận báo cáo vi phạm bài viết hoặc bình luận, xem xét và xử lý bảo vệ cộng đồng</p>
        </div>
        <Button variant="outline-success" size="sm" className="rounded-3" onClick={fetchReports}>
          <i className="bi bi-arrow-clockwise me-1" /> Làm mới
        </Button>
      </div>

      {actionMsg && (
        <Alert variant="success" dismissible onClose={() => setActionMsg('')} className="py-2 small rounded-3">
          <i className="bi bi-check-circle-fill me-2" />{actionMsg}
        </Alert>
      )}

      {/* Lọc trạng thái */}
      <div className="admin-card mb-3 p-3">
        <Row className="g-2 align-items-center">
          <Col xs={12} sm={4}>
            <Form.Select size="sm" className="rounded-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả trạng thái báo cáo</option>
              <option value="PENDING">Chờ xử lý</option>
              <option value="RESOLVED">Đã giải quyết</option>
              <option value="DISMISSED">Đã bác bỏ</option>
            </Form.Select>
          </Col>
        </Row>
      </div>

      {/* Danh sách báo cáo */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="success" />
          <p className="mt-2 text-muted small">Đang nạp danh sách báo cáo...</p>
        </div>
      ) : error ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center rounded-3">
          <span><i className="bi bi-exclamation-triangle me-2" />{error}</span>
          <Button variant="outline-danger" size="sm" onClick={fetchReports}>Thử lại</Button>
        </Alert>
      ) : reports.length === 0 ? (
        <div className="text-center py-5 border rounded-4 bg-light">
          <i className="bi bi-check2-circle text-success display-4" />
          <p className="mt-2 text-muted">Không có báo cáo vi phạm nào trong danh mục này</p>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <Table responsive hover className="mb-0 align-middle admin-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>Mã</th>
                <th>Người gửi báo cáo</th>
                <th>Đối tượng bị phản ánh</th>
                <th>Lý do vi phạm</th>
                <th>Trạng thái</th>
                <th className="text-end">Hành động xử lý</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((rep) => {
                const targetTitle = rep.post
                  ? `[Bài viết] ${rep.post.blog?.title || rep.post.video?.title || 'Bài #' + rep.post.post_id}`
                  : `[Bình luận] ${rep.comment?.content}`;

                return (
                  <tr key={rep.report_id}>
                    <td className="text-muted fw-semibold">#{rep.report_id}</td>
                    <td>
                      <div className="fw-semibold small text-dark">{rep.reporter?.full_name}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{rep.reporter?.email}</div>
                    </td>
                    <td>
                      <div className="small fw-semibold text-truncate" style={{ maxWidth: 260 }} title={targetTitle}>
                        {targetTitle}
                      </div>
                    </td>
                    <td>
                      <div className="small text-danger text-wrap" style={{ maxWidth: 240 }}>
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
                    <td className="text-end">
                      {rep.status === 'PENDING' ? (
                        <>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="me-1 rounded-3"
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
                        </>
                      ) : (
                        <span className="text-muted small">Đã hoàn tất</span>
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
