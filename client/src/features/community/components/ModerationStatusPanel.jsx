// D:/SWP391/SWP391/client/src/features/community/components/ModerationStatusPanel.jsx
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap';

function statusLabel(job) {
  if (!job.isCurrent) return 'Phiên bản cũ';
  if (job.targetStatus === 'DELETED') return 'Nội dung đã gỡ';
  if (job.status === 'FAILED') return 'Kiểm tra gặp lỗi';
  if (job.status === 'PENDING' || job.status === 'PROCESSING') return 'Đang kiểm duyệt';
  if (job.targetStatus === 'HIDDEN_BY_AI') return 'Chờ Admin xem xét';
  if (job.targetStatus === 'HIDDEN') return 'Nội dung đang ẩn';
  return 'Đã kiểm tra';
}

export default function ModerationStatusPanel({ moderation }) {
  const { items, loading, error, meta, page, setPage, refresh } = moderation;
  const pages = Math.max(1, Math.ceil(meta.total / meta.limit));
  return (
    <Card className="mb-3" as="section" aria-label="Trạng thái kiểm duyệt của bạn">
      <Card.Body>
        <h2 className="h6 mb-3">Kiểm duyệt nội dung của bạn</h2>
        {loading && <p role="status" className="text-secondary mb-2"><Spinner as="span" size="sm" animation="border" className="me-2" />Đang tải trạng thái kiểm duyệt…</p>}
        {error && <Alert variant="danger">{error}<Button className="ms-2" variant="outline-danger" onClick={refresh}>Thử lại</Button></Alert>}
        {!loading && !error && !items.length && <p className="text-secondary mb-0">Chưa có yêu cầu kiểm duyệt.</p>}
        <div aria-live="polite">
          {items.map((job) => (
            <article key={job.id} className="border-bottom py-3 text-break">
              <div className="d-flex gap-2 align-items-center flex-wrap mb-1">
                <strong className="small">{job.postId ? 'Bài viết' : 'Bình luận'}</strong>
                <Badge bg={job.status === 'FAILED' ? 'warning' : 'secondary'} text={job.status === 'FAILED' ? 'dark' : undefined}>{statusLabel(job)}</Badge>
              </div>
              <p className="mb-1">{job.preview}</p>
              {(job.result?.reason || job.errorMessage) && <p className="small text-secondary mb-0">{job.result?.reason || job.errorMessage}</p>}
            </article>
          ))}
        </div>
        {meta.pending > 0 && <p className="small text-secondary mt-3 mb-0">Bạn có thể chuyển trang; hệ thống tiếp tục kiểm duyệt ở phía sau.</p>}
        {pages > 1 && <nav aria-label="Phân trang kiểm duyệt" className="d-flex gap-2 align-items-center mt-3 flex-wrap">
          <Button variant="outline-success" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Trang trước</Button>
          <span className="small">Trang {page}/{pages}</span>
          <Button variant="outline-success" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>Trang sau</Button>
        </nav>}
      </Card.Body>
    </Card>
  );
}
