// d:\Projects\FPT\SWP391\client\src\pages\admin\AdminDashboardTab.jsx
import { useEffect, useState, useCallback } from 'react';
import { Row, Col, Alert, Button, Table } from 'react-bootstrap';
import { adminService } from '../../services/adminService.js';
import { subscribeSyncEvent } from '../../lib/syncEvents.js';

export default function AdminDashboardTab({ onNavigateTab }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchStats();

    // Lắng nghe sự kiện đồng bộ để tự động cập nhật số liệu khi có thay đổi
    const unsubscribe = subscribeSyncEvent('*', () => {
      adminService.getDashboardStats().then((res) => {
        if (res?.data) setStats(res.data);
      }).catch(() => {});
    });
    return unsubscribe;
  }, [fetchStats]);

  if (loading) {
    return (
      <div>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="cx-skeleton cx-skeleton-title" />
          <div className="cx-skeleton" style={{ width: 120, height: 32 }} />
        </div>
        <Row className="g-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <Col xs={12} sm={6} lg={3} key={i}>
              <div className="admin-card p-3 cx-skeleton cx-skeleton-card" />
            </Col>
          ))}
        </Row>
        <Row className="g-4">
          <Col xs={12} lg={6}>
            <div className="admin-card p-3 cx-skeleton" style={{ height: 220 }} />
          </Col>
          <Col xs={12} lg={6}>
            <div className="admin-card p-3 cx-skeleton" style={{ height: 220 }} />
          </Col>
        </Row>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="d-flex align-items-center justify-content-between rounded-3 border-danger-subtle">
        <span><i className="bi bi-exclamation-octagon-fill me-2" />{error}</span>
        <Button variant="outline-danger" size="sm" className="rounded-3" onClick={fetchStats}>
          <i className="bi bi-arrow-clockwise me-1" /> Thử lại
        </Button>
      </Alert>
    );
  }

  if (!stats) {
    return (
      <div className="cx-empty-state">
        <div className="cx-empty-icon">
          <i className="bi bi-bar-chart" />
        </div>
        <h5 className="fw-bold mb-1">Chưa có số liệu tổng quan hệ thống</h5>
        <p className="text-muted small mb-3">Hệ thống chưa ghi nhận chỉ số thống kê hoặc kết nối đang bị gián đoạn.</p>
        <Button variant="success" size="sm" className="rounded-3 px-3" onClick={fetchStats}>
          <i className="bi bi-arrow-clockwise me-1" /> Tải lại dữ liệu
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header section */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Tổng Quan Hoạt Động Hệ Thống</h4>
          <p className="text-muted small mb-0">Dữ liệu thời gian thực về cộng đồng, nội dung đăng tải và hiệu năng mô hình AI</p>
        </div>
        <Button variant="outline-success" size="sm" className="rounded-3 px-3 fw-medium" onClick={fetchStats}>
          <i className="bi bi-arrow-clockwise me-1" /> Làm mới dữ liệu
        </Button>
      </div>

      {/* 4 KPI Cards */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <div className="admin-card kpi-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                Thành viên cộng đồng
              </span>
              <div className="kpi-icon-badge kpi-green">
                <i className="bi bi-people-fill" />
              </div>
            </div>
            <h3 className="fw-bold mb-1 text-dark">{stats.members.total}</h3>
            <div className="small text-muted">
              <span className="text-success fw-semibold">{stats.members.active} đang hoạt động</span> · {stats.members.locked} bị khóa
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <div className="admin-card kpi-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                Bài viết & Video
              </span>
              <div className="kpi-icon-badge kpi-blue">
                <i className="bi bi-journal-richtext" />
              </div>
            </div>
            <h3 className="fw-bold mb-1 text-dark">{stats.content.blogs + stats.content.videos}</h3>
            <div className="small text-muted">
              {stats.content.blogs} bài blog · {stats.content.videos} video chia sẻ
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <div className="admin-card kpi-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                Độ chính xác AI
              </span>
              <div className="kpi-icon-badge kpi-amber">
                <i className="bi bi-cpu-fill" />
              </div>
            </div>
            <h3 className="fw-bold mb-1 text-dark">{stats.ai.accuracyRate}%</h3>
            <div className="small text-muted">
              {stats.ai.totalRequests} lượt gọi · {stats.ai.errorRequests} trường hợp lỗi
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <div className="admin-card kpi-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                Cần xử lý ngay
              </span>
              <div className="kpi-icon-badge kpi-rose">
                <i className="bi bi-shield-exclamation" />
              </div>
            </div>
            <h3 className="fw-bold mb-1 text-danger">{stats.reports.pending + stats.content.hiddenByAi}</h3>
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
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-flag-fill text-warning" />
                <h6 className="fw-bold mb-0 text-dark">Báo cáo vi phạm chờ xử lý</h6>
              </div>
              <Button variant="link" size="sm" className="p-0 text-success text-decoration-none fw-semibold small" onClick={() => onNavigateTab('reports')}>
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
                          <div className="fw-semibold small text-dark">{rep.reporter.full_name}</div>
                          <div className="text-muted small text-truncate" style={{ maxWidth: 280 }}>{rep.reason}</div>
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
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-cpu-fill text-primary" />
                <h6 className="fw-bold mb-0 text-dark">Nhật ký tác vụ AI gần nhất</h6>
              </div>
              <Button variant="link" size="sm" className="p-0 text-success text-decoration-none fw-semibold small" onClick={() => onNavigateTab('ai-monitor')}>
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
                            <span className="badge bg-light text-secondary me-2 border">{log.model_name}</span>
                            <span className="small fw-semibold">{actionLabel}</span>
                            {log.error_feedback && (
                              <div className="text-danger small text-truncate" style={{ maxWidth: 280 }}>
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
