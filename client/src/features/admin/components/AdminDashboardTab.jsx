// client/src/features/admin/components/AdminDashboardTab.jsx
import { useEffect, useState } from 'react';
import { Row, Col, Spinner, Alert, Button, Badge } from 'react-bootstrap';
import { adminService } from '../../../services/adminService.js';
import { subscribeSyncEvent } from '../../../utils/syncEvents.js';
import AdminTriageDeck from './AdminTriageDeck.jsx';
import AdminKpiCard from './AdminKpiCard.jsx';
import AdminQuickActions from './AdminQuickActions.jsx';
import AdminRecentReports from './AdminRecentReports.jsx';
import AdminRecentAiLogs from './AdminRecentAiLogs.jsx';
import AdminSystemHealthBanner from './AdminSystemHealthBanner.jsx';

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

  // 1. Trạng thái Đang tải (Loading state)
  if (loading) {
    return (
      <div className="text-center py-5 my-4">
        <Spinner animation="border" variant="success" />
        <p className="mt-3 text-muted small fw-semibold">
          Đang đồng bộ hóa chỉ số hệ sinh thái ChayXanh...
        </p>
      </div>
    );
  }

  // 2. Trạng thái Gặp lỗi (Error state)
  if (error) {
    return (
      <Alert variant="danger" className="d-flex align-items-center justify-content-between rounded-3 p-3 my-3">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-octagon-fill fs-5" />
          <span>{error}</span>
        </div>
        <Button variant="outline-danger" size="sm" onClick={fetchStats}>
          <i className="bi bi-arrow-clockwise me-1" />
          Thử lại
        </Button>
      </Alert>
    );
  }

  // 3. Trạng thái Rỗng (Empty state)
  if (!stats) {
    return (
      <div className="text-center py-5 border rounded-3 bg-light my-3">
        <i className="bi bi-bar-chart text-muted display-4" />
        <p className="mt-2 text-muted fw-semibold">Chưa có số liệu tổng quan hệ thống</p>
        <Button variant="success" size="sm" onClick={fetchStats}>
          Tải lại dữ liệu
        </Button>
      </div>
    );
  }

  // 4. Trạng thái Dữ liệu thật (Success state)
  const activePercent =
    stats.members.total > 0 ? Math.round((stats.members.active / stats.members.total) * 100) : 100;

  const urgentCount = stats.reports.pending + (stats.content.hiddenByAi || 0);

  return (
    <div className="cx-dashboard-container">
      {/* Header Điều Hành Riêng Biệt */}
      <div className="admin-card p-3 p-md-4 mb-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h4 className="fw-bold mb-0 text-dark">
                Tổng Quan Hoạt Động Hệ Sinh Thái
              </h4>
              <Badge bg="success" className="bg-opacity-10 text-success border border-success-subtle fw-normal">
                <span className="cx-live-pulse me-1" />
                Trực tiếp
              </Badge>
            </div>
            <p className="text-muted small mb-0">
              Dữ liệu thống kê thời gian thực · Cập nhật lần cuối: <strong>{lastUpdated || 'Vừa xong'}</strong>
            </p>
          </div>
          <Button
            variant="outline-success"
            size="sm"
            className="rounded-pill px-3 d-inline-flex align-items-center gap-1 shadow-sm"
            onClick={fetchStats}
          >
            <i className="bi bi-arrow-clockwise" />
            <span>Làm mới dữ liệu</span>
          </Button>
        </div>
      </div>

      {/* Signature Element: Sàn Xử Lý Khẩn Cấp (Triage Deck) */}
      <AdminTriageDeck
        pendingReports={stats.reports.pending}
        flaggedItems={stats.content.hiddenByAi || 0}
        onNavigateTab={onNavigateTab}
      />

      {/* 4 Trụ Cột Chỉ Số Sống (Vitality Pillars) */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl={3}>
          <AdminKpiCard
            title="Cộng đồng Dinh dưỡng"
            value={stats.members.total}
            icon="bi-people-fill"
            colorClass="green"
            badgeText={`${activePercent}% hoạt động`}
            badgeVariant="success"
            subtext={`${stats.members.active} hoạt động · ${stats.members.locked} bị khóa`}
            progressPercent={activePercent}
            progressVariant="success"
            onClick={() => onNavigateTab('members')}
          />
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <AdminKpiCard
            title="Kho Nội dung & Video"
            value={stats.content.blogs + stats.content.videos}
            icon="bi-journal-richtext"
            colorClass="blue"
            badgeText={`${stats.content.comments} bình luận`}
            badgeVariant="info"
            subtext={`${stats.content.blogs} bài blog · ${stats.content.videos} video`}
            onClick={() => onNavigateTab('posts')}
          />
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <AdminKpiCard
            title="Lá chắn & Độ tin cậy AI"
            value={`${stats.ai.accuracyRate}%`}
            icon="bi-cpu-fill"
            colorClass="amber"
            badgeText={`${stats.ai.totalRequests} truy vấn`}
            badgeVariant="warning"
            subtext={`${stats.ai.successRequests} thành công · ${stats.ai.errorRequests} sự cố`}
            progressPercent={stats.ai.accuracyRate}
            progressVariant={
              stats.ai.accuracyRate >= 90 ? 'success' : stats.ai.accuracyRate >= 70 ? 'warning' : 'danger'
            }
            onClick={() => onNavigateTab('ai-monitor')}
          />
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <AdminKpiCard
            title="Hàng chờ Kiểm duyệt"
            value={urgentCount}
            icon="bi-shield-exclamation"
            colorClass="rose"
            badgeText={urgentCount > 0 ? 'Cần duyệt' : 'An toàn'}
            badgeVariant={urgentCount > 0 ? 'danger' : 'success'}
            subtext={`${stats.reports.pending} báo cáo · ${stats.content.hiddenByAi || 0} nội dung gắn cờ`}
            onClick={() => onNavigateTab(stats.reports.pending > 0 ? 'reports' : 'ai-moderation')}
          />
        </Col>
      </Row>

      {/* Thanh Phím Tắt Điều Hành Nhanh */}
      <AdminQuickActions
        onNavigateTab={onNavigateTab}
        pendingReports={stats.reports.pending}
        flaggedItems={stats.content.hiddenByAi || 0}
      />

      {/* Dòng Hoạt Động Kép (Báo Cáo & AI Telemetry) */}
      <Row className="g-4 mb-2">
        <AdminRecentReports reports={stats.reports} onNavigateTab={onNavigateTab} />
        <AdminRecentAiLogs ai={stats.ai} onNavigateTab={onNavigateTab} />
      </Row>

      {/* Băng Hạ Tầng & Kết Nối Dịch Vụ */}
      <AdminSystemHealthBanner />
    </div>
  );
}
