// client/src/features/admin/components/AdminRecentAiLogs.jsx
import { Col, Table, Badge, Button } from 'react-bootstrap';

export default function AdminRecentAiLogs({ ai, onNavigateTab }) {
  const recentLogs = ai?.recentLogs || [];

  return (
    <Col xs={12} lg={6}>
      <div className="admin-card h-100 overflow-hidden d-flex flex-column">
        <div className="admin-card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-cpu-fill text-primary" />
            <h6 className="fw-bold mb-0 text-dark">Nhật ký tác vụ AI gần nhất</h6>
          </div>
          <Button
            variant="link"
            size="sm"
            className="p-0 text-success text-decoration-none fw-semibold small"
            onClick={() => onNavigateTab('ai-monitor')}
          >
            Xem chi tiết &rarr;
          </Button>
        </div>
        <div className="p-0 flex-grow-1">
          {recentLogs.length === 0 ? (
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
                {recentLogs.map((log) => {
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
  );
}
