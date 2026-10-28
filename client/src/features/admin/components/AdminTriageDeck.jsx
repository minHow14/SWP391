// client/src/features/admin/components/AdminTriageDeck.jsx
import { Button, Badge } from 'react-bootstrap';

export default function AdminTriageDeck({ pendingReports = 0, flaggedItems = 0, onNavigateTab }) {
  const urgentTotal = pendingReports + flaggedItems;

  if (urgentTotal === 0) {
    return (
      <div className="cx-triage-deck cx-triage-deck-calm mb-4 p-3 p-md-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="cx-triage-icon-wrap is-calm">
              <i className="bi bi-shield-check" />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <span className="cx-triage-title">Hệ thống trong tầm kiểm soát</span>
                <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1 small">
                  Tất cả an toàn
                </span>
              </div>
              <p className="cx-triage-desc mb-0 mt-1">
                Không có báo cáo vi phạm mới hoặc nội dung bất thường bị hệ thống AI chặn.
              </p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline-success"
              size="sm"
              className="rounded-pill px-3"
              onClick={() => onNavigateTab('ai-moderation')}
            >
              <i className="bi bi-shield-shaded me-1" />
              Lịch sử kiểm duyệt
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cx-triage-deck cx-triage-deck-urgent mb-4 p-3 p-md-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-start gap-3">
          <div className="cx-triage-icon-wrap is-urgent">
            <i className="bi bi-exclamation-triangle-fill" />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="cx-triage-title">Sàn xử lý khẩn cấp</span>
              <Badge bg="danger" pill className="px-2 py-1">
                {urgentTotal} mục cần duyệt
              </Badge>
            </div>
            <p className="cx-triage-desc mb-0 mt-1">
              Phát hiện phản hồi từ người dùng hoặc nội dung vi phạm tiêu chuẩn dinh dưỡng thuần chay.
            </p>
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {pendingReports > 0 && (
            <Button
              variant="danger"
              size="sm"
              className="rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-1"
              onClick={() => onNavigateTab('reports')}
            >
              <i className="bi bi-flag-fill" />
              <span>Xử lý {pendingReports} báo cáo</span>
            </Button>
          )}

          {flaggedItems > 0 && (
            <Button
              variant="warning"
              size="sm"
              className="rounded-pill px-3 shadow-sm text-dark d-inline-flex align-items-center gap-1"
              onClick={() => onNavigateTab('ai-moderation')}
            >
              <i className="bi bi-shield-slash-fill" />
              <span>Kiểm tra {flaggedItems} cờ AI</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
