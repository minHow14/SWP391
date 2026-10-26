// client/src/features/admin/components/AdminRecentReports.jsx
import { Col, Table, Badge, Button } from 'react-bootstrap';

export default function AdminRecentReports({ reports, onNavigateTab }) {
  const pendingCount = reports?.pending || 0;
  const recentList = reports?.recent || [];

  return (
    <Col xs={12} lg={6}>
      <div className="admin-card h-100 overflow-hidden d-flex flex-column">
        <div className="admin-card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-flag-fill text-danger" />
            <h6 className="fw-bold mb-0 text-dark">Báo cáo vi phạm chờ xử lý</h6>
            {pendingCount > 0 && (
              <Badge bg="danger" pill className="px-2" style={{ fontSize: '0.7rem' }}>
                {pendingCount}
              </Badge>
            )}
          </div>
          <Button
            variant="link"
            size="sm"
            className="p-0 text-success text-decoration-none fw-semibold small"
            onClick={() => onNavigateTab('reports')}
          >
            Xem tất cả &rarr;
          </Button>
        </div>
        <div className="p-0 flex-grow-1">
          {recentList.length === 0 ? (
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
                {recentList.map((rep) => (
                  <tr key={rep.report_id} className="cursor-pointer" onClick={() => onNavigateTab('reports')}>
                    <td className="ps-3">
                      <div className="d-flex align-items-center gap-2">
                        <div className="admin-avatar-circle">
                          {(rep.reporter?.full_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <div className="fw-semibold small text-truncate">{rep.reporter?.full_name}</div>
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
  );
}
