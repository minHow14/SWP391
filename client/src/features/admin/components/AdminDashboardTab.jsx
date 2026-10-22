// client/src/features/admin/components/AdminDashboardTab.jsx
import { useEffect, useState } from 'react';
import { Row, Col, Spinner, Alert, Button, Table } from 'react-bootstrap';
import { adminService } from '../../../services/adminService.js';
import { subscribeSyncEvent } from '../../../utils/syncEvents.js';

export default function AdminDashboardTab({ onNavigateTab }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminService.getDashboardStats();
      setStats(response.data);
    } catch (err) {
      setError(err.message || 'Không thể tải số liệu thống kê hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Lắng nghe sự kiện đồng bộ để tự động cập nhật số liệu khi có thay đổi từ bất kỳ tab hoặc trang nào
    const unsubscribe = subscribeSyncEvent('*', () => {
      adminService.getDashboardStats().then((res) => {
        if (res?.data) setStats(res.data);
      }).catch(() => {});
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="success" />
        <p className="mt-2 text-muted small">Đang cập nhật chỉ số hệ thống...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="d-flex align-items-center justify-content-between">
        <span><i className="bi bi-exclamation-octagon-fill me-2" />{error}</span>
        <Button variant="outline-danger" size="sm" onClick={fetchStats}>Thử lại</Button>
      </Alert>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-5 border rounded bg-light">
        <i className="bi bi-bar-chart text-muted display-4" />
        <p className="mt-2 text-muted">Chưa có số liệu tổng quan hệ thống</p>
        <Button variant="success" size="sm" onClick={fetchStats}>Tải lại</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Tổng Quan Hoạt Động Hệ Thống</h4>
          <p className="text-muted small mb-0">Theo dõi dữ liệu thực tế về cộng đồng, nội dung đăng tải và hiệu năng mô hình AI</p>
        </div>
        <Button variant="outline-success" size="sm" className="rounded-3" onClick={fetchStats}>
          <i className="bi bi-arrow-clockwise me-1" /> Làm mới dữ liệu
        </Button>
      </div>

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <div className="admin-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Cộng đồng thành viên</span>
              <div className="kpi-icon-badge kpi-green">
                <i className="bi bi-people-fill" />
              </div>
            </div>
            <h3 className="fw-bold mb-1">{stats.members.total}</h3>
            <div className="small text-muted">
              <span className="text-success fw-semibold">{stats.members.active} đang hoạt động</span> · {stats.members.locked} bị khóa
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <div className="admin-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Bài viết & Video</span>
              <div className="kpi-icon-badge kpi-blue">
                <i className="bi bi-journal-richtext" />
              </div>
            </div>
            <h3 className="fw-bold mb-1">{stats.content.blogs + stats.content.videos}</h3>
            <div className="small text-muted">
              {stats.content.blogs} bài blog · {stats.content.videos} video chia sẻ
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <div className="admin-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Độ chính xác AI</span>
              <div className="kpi-icon-badge kpi-amber">
                <i className="bi bi-cpu-fill" />
              </div>
            </div>
            <h3 className="fw-bold mb-1">{stats.ai.accuracyRate}%</h3>
            <div className="small text-muted">
              {stats.ai.totalRequests} lượt xử lý · {stats.ai.errorRequests} trường hợp lỗi
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <div className="admin-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Cần xử lý ngay</span>
              <div className="kpi-icon-badge kpi-rose">
                <i className="bi bi-shield-exclamation" />
              </div>
            </div>
            <h3 className="fw-bold mb-1">{stats.reports.pending + stats.content.hiddenByAi}</h3>
            <div className="small text-muted">
              {stats.reports.pending} báo cáo chờ duyệt · {stats.content.hiddenByAi} nội dung gắn cờ
            </div>
          </div>
        </Col>
      </Row>

      {/* Chi tiết hoạt động gần đây */}
      <Row className="g-4">
        <Col xs={12} lg={6}>
          <div className="admin-card h-100 overflow-hidden">
            <div className="admin-card-header d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-dark">Báo cáo vi phạm chờ xử lý</h6>
              <Button variant="link" size="sm" className="p-0 text-success text-decoration-none fw-semibold" onClick={() => onNavigateTab('reports')}>
                Xem tất cả &rarr;
              </Button>
            </div>
            <div className="p-0">
              {stats.reports.recent.length === 0 ? (
                <div className="text-center py-4 text-muted small">Không có báo cáo nào gần đây</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle admin-table">
                  <thead>
                    <tr>
                      <th className="ps-3">Người báo cáo & Nội dung</th>
                      <th className="text-end pe-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.reports.recent.map((rep) => (
                      <tr key={rep.report_id}>
                        <td className="ps-3">
                          <div className="fw-semibold small">{rep.reporter.full_name}</div>
                          <div className="text-muted small text-truncate" style={{ maxWidth: 300 }}>{rep.reason}</div>
                        </td>
                        <td className="text-end pe-3">
                          <span className={`cx-badge ${rep.status === 'PENDING' ? 'cx-badge-locked' : 'cx-badge-active'}`}>
                            {rep.status === 'PENDING' ? 'Chờ duyệt' : 'Đã giải quyết'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          </div>
        </Col>

        <Col xs={12} lg={6}>
          <div className="admin-card h-100 overflow-hidden">
            <div className="admin-card-header d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-dark">Nhật ký tác vụ AI gần nhất</h6>
              <Button variant="link" size="sm" className="p-0 text-success text-decoration-none fw-semibold" onClick={() => onNavigateTab('ai-monitor')}>
                Xem chi tiết &rarr;
              </Button>
            </div>
            <div className="p-0">
              {stats.ai.recentLogs.length === 0 ? (
                <div className="text-center py-4 text-muted small">Chưa có nhật ký hoạt động nào</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle admin-table">
                  <thead>
                    <tr>
                      <th className="ps-3">Tác vụ & Phản hồi</th>
                      <th className="text-end pe-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.ai.recentLogs.map((log) => {
                      const actionLabel =
                        log.action === 'SPAM_DETECTION' ? 'Kiểm duyệt Spam' :
                        log.action === 'CHATBOT_GUEST_QUERY' ? 'Chatbot Tư vấn' :
                        log.action === 'NUTRIENT_ANALYSIS' ? 'Phân tích Món' : log.action;
                      return (
                        <tr key={log.log_id}>
                          <td className="ps-3">
                            <span className="badge bg-light text-dark me-2 border">{log.model_name}</span>
                            <span className="small fw-semibold">{actionLabel}</span>
                            {log.error_feedback && (
                              <div className="text-danger small text-truncate" style={{ maxWidth: 300 }}>
                                {log.error_feedback}
                              </div>
                            )}
                          </td>
                          <td className="text-end pe-3">
                            <span className={`cx-badge ${
                              log.status === 'SUCCESS' ? 'cx-badge-active' :
                              log.status === 'RESOLVED_BY_ADMIN' ? 'cx-badge-info' : 'cx-badge-danger'
                            }`}>
                              {log.status === 'SUCCESS' ? 'Thành công' : log.status === 'RESOLVED_BY_ADMIN' ? 'Đã can thiệp' : 'Gặp lỗi'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
