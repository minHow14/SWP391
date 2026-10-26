// client/src/features/admin/components/AdminDashboardTab.jsx
import { useEffect, useState } from 'react';
import { Row, Col, Spinner, Alert, Button, Badge } from 'react-bootstrap';
import { adminService } from '../../../services/adminService.js';
import { subscribeSyncEvent } from '../../../utils/syncEvents.js';
import AdminKpiCard from './AdminKpiCard.jsx';
import AdminQuickActions from './AdminQuickActions.jsx';
import AdminRecentReports from './AdminRecentReports.jsx';
import AdminRecentAiLogs from './AdminRecentAiLogs.jsx';

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
      adminService
        .getDashboardStats()
        .then((res) => {
          if (res?.data) {
            setStats(res.data);
            setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
          }
        })
        .catch(() => {});
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
        <span>
          <i className="bi bi-exclamation-octagon-fill me-2" />
          {error}
        </span>
        <Button variant="outline-danger" size="sm" onClick={fetchStats}>
          Thử lại
        </Button>
      </Alert>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-5 border rounded-3 bg-light">
        <i className="bi bi-bar-chart text-muted display-4" />
        <p className="mt-2 text-muted">Chưa có số liệu tổng quan hệ thống</p>
        <Button variant="success" size="sm" onClick={fetchStats}>
          Tải lại
        </Button>
      </div>
    );
  }

  const activePercent =
    stats.members.total > 0 ? Math.round((stats.members.active / stats.members.total) * 100) : 100;

  const urgentCount = stats.reports.pending + (stats.content.hiddenByAi || 0);

  return (
    <div>
      {/* Header Dashboard */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
            <span>Tổng Quan Hoạt Động Hệ Thống</span>
            <Badge
              bg="success"
              className="bg-opacity-10 text-success border border-success-subtle fw-normal"
              style={{ fontSize: '0.75rem' }}
            >
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
            progressVariant={
              stats.ai.accuracyRate >= 90 ? 'success' : stats.ai.accuracyRate >= 70 ? 'warning' : 'danger'
            }
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

      {/* Chi tiết hoạt động gần đây (Tách component nhỏ) */}
      <Row className="g-4 mb-4">
        <AdminRecentReports reports={stats.reports} onNavigateTab={onNavigateTab} />
        <AdminRecentAiLogs ai={stats.ai} onNavigateTab={onNavigateTab} />
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
