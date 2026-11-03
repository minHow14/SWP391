// client/src/features/admin/components/AdminRecentReports.jsx
import { Col, Table, Badge, Button } from 'react-bootstrap';
import { formatCreatedAt } from '../../../utils/formatters.js';

export default function AdminRecentReports({ reports, onNavigateTab }) {
  const pendingCount = reports?.pending || 0;
  const recentList = reports?.recent || [];

  return (
    <Col xs={12} lg={6}>
      <div className="cx-feed-card h-100 overflow-hidden d-flex flex-column">
        <div className="cx-feed-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div className="cx-feed-badge-icon is-danger">
              <i className="bi bi-flag-fill" />
            </div>
            <div>
              <h6 className="fw-bold mb-0 text-dark">Báo cáo vi phạm gần nhất</h6>
              <span className="cx-eyebrow text-muted">Hàng chờ kiểm duyệt từ cộng đồng</span>
            </div>
            {pendingCount > 0 && (
              <Badge bg="danger" pill className="px-2 py-1 ms-1">
                {pendingCount} chờ duyệt
              </Badge>
            )}
          </div>
          <Button
            variant="link"
            size="sm"
            className="p-0 text-success text-decoration-none fw-semibold small d-inline-flex align-items-center gap-1"
            onClick={() => onNavigateTab('reports')}
          >
            <span>Xem tất cả</span>
            <i className="bi bi-chevron-right small" />
          </Button>
        </div>

        <div className="p-0 flex-grow-1">
          {recentList.length === 0 ? (
            <div className="text-center py-5 px-3">
              <div className="cx-empty-icon mb-2 text-success">
                <i className="bi bi-check2-circle fs-1" />
              </div>
              <h6 className="fw-bold text-dark mb-1">Cộng đồng đang an toàn</h6>
              <p className="text-muted small mb-0">
                Không ghi nhận phản ánh hay báo cáo vi phạm nào gần đây.
              </p>
            </div>
          ) : (
            <Table responsive hover className="mb-0 align-middle cx-stream-table">
              <thead>
                <tr>
                  <th className="ps-3">Người báo cáo & Lý do</th>
                  <th>Thời điểm</th>
                  <th className="text-end pe-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentList.map((rep) => {
                  const reporterInitial = (rep.reporter?.full_name || 'U').charAt(0).toUpperCase();
                  const isPending = rep.status === 'PENDING';
                  const timeFormatted = rep.created_at ? formatCreatedAt(rep.created_at) : '—';

                  return (
                    <tr
                      key={rep.report_id}
                      className="cursor-pointer"
                      onClick={() => onNavigateTab('reports')}
                    >
                      <td className="ps-3 py-3">
                        <div className="d-flex align-items-center gap-2">
                          <div className="cx-feed-avatar">
                            {reporterInitial}
                          </div>
                          <div className="overflow-hidden">
                            <div className="fw-semibold small text-dark text-truncate">
                              {rep.reporter?.full_name || 'Thành viên ẩn danh'}
                            </div>
                            <div className="text-muted small text-truncate" style={{ maxWidth: 220 }} title={rep.reason}>
                              {rep.reason}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="small text-muted text-nowrap">
                        {timeFormatted}
                      </td>
                      <td className="text-end pe-3">
                        <span className={`cx-status-pill ${isPending ? 'is-pending' : 'is-resolved'}`}>
                          {isPending ? 'Chờ duyệt' : 'Đã giải quyết'}
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
  );
}
