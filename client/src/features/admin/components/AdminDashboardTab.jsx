// client/src/features/admin/components/AdminDashboardTab.jsx
import { useEffect, useState } from 'react';
import { Row, Col, Spinner, Alert, Button, Table, Badge } from 'react-bootstrap';
import { adminService } from '../../../services/adminService.js';
import { subscribeSyncEvent } from '../../../utils/syncEvents.js';
import AdminKpiCard from './AdminKpiCard.jsx';
import AdminQuickActions from './AdminQuickActions.jsx';

export default function AdminDashboardTab({ onNavigateTab }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminService.getDashboardStats();
      setStats(response.data);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch (err) {
      setError(err.message || 'Không thể tải số liệu thống kê hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const unsubscribe = subscribeSyncEvent('*', () => {
      adminService.getDashboardStats().then((res) => {
        if (res?.data) {
          setStats(res.data);
          setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
        }
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
      <Alert variant="danger" className="d-flex align-items-center justify-content-between rounded-3">
        <span><i className="bi bi-exclamation-octagon-fill me-2" />{error}</span>
        <Button variant="outline-danger" size="sm" onClick={fetchStats}>Thử lại</Button>
      </Alert>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-5 border rounded-3 bg-light">
        <i className="bi bi-bar-chart text-muted display-4" />
        <p className="mt-2 text-muted">Chưa có số liệu tổng quan hệ thống</p>
        <Button variant="success" size="sm" onClick={fetchStats}>Tải lại</Button>
      </div>
    );
  }

  const activePercent = stats.members.total > 0
    ? Math.round((stats.members.active / stats.members.total) * 100)
    : 100;

  const urgentCount = stats.reports.pending + (stats.content.hiddenByAi || 0);

  return (
    <div>
      {/* Header Dashboard */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
            <span>Tổng Quan Hoạt Động Hệ Thống</span>
            <Badge bg="success" className="bg-opacity-10 text-success border border-success-subtle fw-normal" style={{ fontSize: '0.75rem' }}>
              <i className="bi bi-broadcast me-1" /> Trực tiếp
            </Badge>
          </h4>
          <p className="text-muted small mb-0">
            Dữ liệu thống kê thời gian thực · Cập nhật lần cuối: <strong>{lastUpdated || 'Vừa xong'}</strong>
          </p>
        </div>
        <Button variant="outline-success" size="sm" className="rounded-pill px-3" onClick={fetchStats}>
          <i className="bi bi-arrow-clockwise me-1" /> Làm mới dữ liệu
        </Button>
      </div>

      {/* Quick Action Toolbar */}
      <AdminQuickActions
        onNavigateTab={onNavigateTab}
        pendingReports={stats.reports.pending}
        flaggedItems={stats.content.hiddenByAi || 0}
      />

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl={3}>
          <AdminKpiCard
            title="Cộng đồng thành viên"
            value={stats.members.total}
            icon="bi-people-fill"
            colorClass="green"
            badgeText={`${activePercent}% hoạt động`}
            badgeVariant="success"
            subtext={`${stats.members.active} đang hoạt động · ${stats.members.locked} bị khóa`}
            progressPercent={activePercent}
            progressVariant="success"
            onClick={() => onNavigateTab('members')}
          />
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <AdminKpiCard
            title="Bài viết & Video"
            value={stats.content.blogs + stats.content.videos}
            icon="bi-journal-richtext"
            colorClass="blue"
            badgeText={`${stats.content.comments} bình luận`}
            badgeVariant="info"
            subtext={`${stats.content.blogs} bài blog · ${stats.content.videos} video chia sẻ`}
            onClick={() => onNavigateTab('posts')}
          />
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <AdminKpiCard
            title="Độ chính xác AI"
            value={`${stats.ai.accuracyRate}%`}
            icon="bi-cpu-fill"
            colorClass="amber"
            badgeText={`${stats.ai.totalRequests} lượt gọi`}
            badgeVariant="warning"
            subtext={`${stats.ai.successRequests} thành công · ${stats.ai.errorRequests} gặp sự cố`}
            progressPercent={stats.ai.accuracyRate}
            progressVariant={stats.ai.accuracyRate >= 90 ? 'success' : stats.ai.accuracyRate >= 70 ? 'warning' : 'danger'}
            onClick={() => onNavigateTab('ai-monitor')}
          />
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <AdminKpiCard
            title="Cần xử lý ngay"
            value={urgentCount}
            icon="bi-shield-exclamation"
            colorClass="rose"
            badgeText={urgentCount > 0 ? 'Cần duyệt' : 'An toàn'}
            badgeVariant={urgentCount > 0 ? 'danger' : 'success'}
            subtext={`${stats.reports.pending} báo cáo chờ duyệt · ${stats.content.hiddenByAi || 0} nội dung AI gắn cờ`}
            onClick={() => onNavigateTab(stats.reports.pending > 0 ? 'reports' : 'ai-moderation')}
          />
        </Col>
      </Row>

      {/* Chi tiết hoạt động gần đây */}
      <Row className="g-4 mb-4">
        {/* Panel 1: Báo cáo vi phạm chờ xử lý */}
        <Col xs={12} lg={6}>
          <div className="admin-card h-100 overflow-hidden d-flex flex-column">
            <div className="admin-card-header d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-flag-fill text-danger" />
                <h6 className="fw-bold mb-0 text-dark">Báo cáo vi phạm chờ xử lý</h6>
                {stats.reports.pending > 0 && (
                  <Badge bg="danger" pill className="px-2" style={{ fontSize: '0.7rem' }}>
                    {stats.reports.pending}
                  </Badge>
                )}
              </div>
              <Button variant="link" size="sm" className="p-0 text-success text-decoration-none fw-semibold small" onClick={() => onNavigateTab('reports')}>
                Xem tất cả &rarr;
              </Button>
            </div>
            <div className="p-0 flex-grow-1">
              {stats.reports.recent.length === 0 ? (
                <div className="text-center py-5 text-muted small">
                  <i className="bi bi-check-circle text-success fs-3 d-block mb-1" />
                  Không có báo cáo vi phạm nào gần đây
                </div>
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
                      <tr key={rep.report_id} className="cursor-pointer" onClick={() => onNavigateTab('reports')}>
                        <td className="ps-3">
                          <div className="d-flex align-items-center gap-2">
                            <div className="admin-avatar-circle">
                              {(rep.reporter.full_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                              <div className="fw-semibold small text-truncate">{rep.reporter.full_name}</div>
                              <div className="text-muted small text-truncate" style={{ maxWidth: 280 }}>{rep.reason}</div>
                            </div>
                          </div>
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

        {/* Panel 2: Nhật ký AI gần nhất */}
        <Col xs={12} lg={6}>
          <div className="admin-card h-100 overflow-hidden d-flex flex-column">
            <div className="admin-card-header d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-cpu-fill text-primary" />
                <h6 className="fw-bold mb-0 text-dark">Nhật ký tác vụ AI gần nhất</h6>
              </div>
              <Button variant="link" size="sm" className="p-0 text-success text-decoration-none fw-semibold small" onClick={() => onNavigateTab('ai-monitor')}>
                Xem chi tiết &rarr;
              </Button>
            </div>
            <div className="p-0 flex-grow-1">
              {stats.ai.recentLogs.length === 0 ? (
                <div className="text-center py-5 text-muted small">
                  <i className="bi bi-cpu text-muted fs-3 d-block mb-1" />
                  Chưa có nhật ký hoạt động nào
                </div>
              ) : (
                <Table responsive hover className="mb-0 align-middle admin-table">
                  <thead>
                    <tr>
                      <th className="ps-3">Tác vụ & Mô hình</th>
                      <th className="text-end pe-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.ai.recentLogs.map((log) => {
                      const actionLabel =
                        log.action === 'SPAM_DETECTION' ? 'Kiểm duyệt Spam' :
                        log.action === 'CHATBOT_GUEST_QUERY' ? 'Chatbot Tư vấn' :
                        log.action === 'NUTRIENT_ANALYSIS' ? 'Phân tích Món' :
                        log.action === 'MODERATION_MANUAL_OVERRIDE' ? 'Ghi đè thủ công' : log.action;
                      return (
                        <tr key={log.log_id} className="cursor-pointer" onClick={() => onNavigateTab('ai-monitor')}>
                          <td className="ps-3">
                            <div className="d-flex align-items-center gap-2">
                              <Badge bg="light" text="dark" className="border fw-normal" style={{ fontSize: '0.72rem' }}>
                                {log.model_name || 'deepseek'}
                              </Badge>
                              <span className="small fw-semibold text-truncate">{actionLabel}</span>
                            </div>
                            {log.error_feedback && (
                              <div className="text-danger small text-truncate mt-1" style={{ maxWidth: 280 }}>
                                <i className="bi bi-info-circle me-1" />{log.error_feedback}
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

      {/* System Status Banner */}
      <div className="admin-card p-3 bg-light bg-opacity-50 border-dashed">
        <Row className="g-3 align-items-center text-center text-md-start">
          <Col xs={12} md={4} className="d-flex align-items-center justify-content-center justify-content-md-start gap-2">
            <span className="status-dot status-dot-online" />
            <span className="small">
              <strong>Cơ sở dữ liệu:</strong> PostgreSQL 15+ (Prisma ORM)
            </span>
          </Col>
          <Col xs={12} md={4} className="d-flex align-items-center justify-content-center justify-content-md-start gap-2">
            <span className="status-dot status-dot-online" />
            <span className="small">
              <strong>AI Microservice:</strong> FastAPI (DeepSeek Engine)
            </span>
          </Col>
          <Col xs={12} md={4} className="d-flex align-items-center justify-content-center justify-content-md-start gap-2">
            <span className="status-dot status-dot-online" />
            <span className="small">
              <strong>Lưu trữ dữ liệu:</strong> Tự động dọn dẹp sau 30 ngày
            </span>
          </Col>
        </Row>
      </div>
    </div>
  );
}
