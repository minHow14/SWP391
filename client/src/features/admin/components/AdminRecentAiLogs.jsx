// client/src/features/admin/components/AdminRecentAiLogs.jsx
import { Col, Table, Badge, Button } from 'react-bootstrap';
import { formatCreatedAt } from '../../../utils/formatters.js';

function getActionLabel(action = '') {
  if (action === 'SPAM_DETECTION') return 'Kiểm duyệt bài viết';
  if (action.startsWith('CHAT')) return 'Tư vấn dinh dưỡng';
  if (action.startsWith('MEAL_PLANNER') || action === 'NUTRIENT_ANALYSIS') return 'Phân tích món & Thực đơn';
  if (action === 'MODERATION_MANUAL_OVERRIDE') return 'Ghi đè thủ công';
  return action || 'Tác vụ AI';
}

export default function AdminRecentAiLogs({ ai, onNavigateTab }) {
  const recentLogs = ai?.recentLogs || [];

  return (
    <Col xs={12} lg={6}>
      <div className="cx-feed-card h-100 overflow-hidden d-flex flex-column">
        <div className="cx-feed-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div className="cx-feed-badge-icon is-tech">
              <i className="bi bi-cpu-fill" />
            </div>
            <div>
              <h6 className="fw-bold mb-0 text-dark">Nhật ký tác vụ AI gần nhất</h6>
              <span className="cx-eyebrow text-muted">Giám sát phản hồi & Tỷ lệ tin cậy</span>
            </div>
          </div>
          <Button
            variant="link"
            size="sm"
            className="p-0 text-success text-decoration-none fw-semibold small d-inline-flex align-items-center gap-1"
            onClick={() => onNavigateTab('ai-monitor')}
          >
            <span>Xem chi tiết</span>
            <i className="bi bi-chevron-right small" />
          </Button>
        </div>

        <div className="p-0 flex-grow-1">
          {recentLogs.length === 0 ? (
            <div className="text-center py-5 px-3">
              <div className="cx-empty-icon mb-2 text-muted">
                <i className="bi bi-cpu fs-1" />
              </div>
              <h6 className="fw-bold text-dark mb-1">Chưa có nhật ký AI</h6>
              <p className="text-muted small mb-0">
                Hệ thống chưa ghi nhận truy vấn AI phát sinh trong chu kỳ này.
              </p>
            </div>
          ) : (
            <Table responsive hover className="mb-0 align-middle cx-stream-table">
              <thead>
                <tr>
                  <th className="ps-3">Tác vụ & Mô hình</th>
                  <th>Thời điểm</th>
                  <th className="text-end pe-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => {
                  const logId = log.logId || log.log_id;
                  const modelName = log.modelName || log.model_name || 'deepseek';
                  const action = log.action || '';
                  const status = log.status || 'SUCCESS';
                  const errorFeedback = log.errorFeedback || log.error_feedback;
                  const createdAt = log.createdAt || log.created_at;
                  const timeFormatted = createdAt ? formatCreatedAt(createdAt) : '—';

                  const isSuccess = status === 'SUCCESS';
                  const isResolved = status === 'RESOLVED_BY_ADMIN';

                  return (
                    <tr
                      key={logId}
                      className="cursor-pointer"
                      onClick={() => onNavigateTab('ai-monitor')}
                    >
                      <td className="ps-3 py-3">
                        <div className="d-flex align-items-center gap-2">
                          <Badge bg="light" text="dark" className="border fw-normal cx-model-badge">
                            {modelName}
                          </Badge>
                          <span className="small fw-semibold text-dark text-truncate">
                            {getActionLabel(action)}
                          </span>
                        </div>
                        {errorFeedback && (
                          <div className="text-danger small text-truncate mt-1" style={{ maxWidth: 240 }} title={errorFeedback}>
                            <i className="bi bi-info-circle me-1" />
                            {errorFeedback}
                          </div>
                        )}
                      </td>
                      <td className="small text-muted text-nowrap">
                        {timeFormatted}
                      </td>
                      <td className="text-end pe-3">
                        <span
                          className={`cx-status-pill ${
                            isSuccess ? 'is-success' : isResolved ? 'is-resolved' : 'is-error'
                          }`}
                        >
                          {isSuccess ? 'Thành công' : isResolved ? 'Đã can thiệp' : 'Gặp lỗi'}
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
