// client/src/features/admin/components/AdminCommentTable.jsx
import { Table, Button } from 'react-bootstrap';

export default function AdminCommentTable({ comments, onRestore, onDeleteClick }) {
  return (
    <div className="admin-card overflow-hidden">
      <Table responsive hover className="mb-0 align-middle admin-table">
        <thead>
          <tr>
            <th>Nội dung bình luận</th>
            <th>Người đăng</th>
            <th>Bài viết liên kết</th>
            <th>Cờ cảnh báo AI</th>
            <th>Trạng thái</th>
            <th className="text-end pe-3">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {comments.map((c) => {
            const isHidden = c.status === 'HIDDEN' || c.status === 'DELETED';
            const isPermanentDeleted = c.status === 'DELETED';

            return (
              <tr key={c.comment_id} className={isHidden ? 'table-light opacity-75' : ''}>
                <td>
                  <div className="fw-semibold text-dark text-wrap" style={{ maxWidth: 280 }}>
                    <i className="bi bi-chat-quote me-1 text-muted" />
                    {c.content}
                  </div>
                </td>
                <td className="small">
                  <div className="fw-semibold">{c.user?.full_name}</div>
                </td>
                <td className="small text-truncate" style={{ maxWidth: 180 }}>
                  <span className="text-muted">
                    {c.post?.blog?.title || c.post?.video?.title || 'Bài viết #' + c.post_id}
                  </span>
                </td>
                <td>
                  {c.is_flagged_by_ai ? (
                    <span className="cx-badge cx-badge-danger">
                      <i className="bi bi-flag-fill me-1" /> Có cờ nghi vấn
                    </span>
                  ) : (
                    <span className="cx-badge cx-badge-neutral">Bình thường</span>
                  )}
                </td>
                <td>
                  <span
                    className={`cx-badge ${
                      c.status === 'ACTIVE'
                        ? 'cx-badge-active'
                        : c.status === 'HIDDEN_BY_AI'
                        ? 'cx-badge-locked'
                        : c.status === 'HIDDEN'
                        ? 'cx-badge-locked'
                        : 'cx-badge-neutral'
                    }`}
                  >
                    {c.status === 'ACTIVE'
                      ? 'Đang hiển thị'
                      : c.status === 'HIDDEN_BY_AI'
                      ? 'AI đã ẩn'
                      : c.status === 'HIDDEN'
                      ? 'Đã ẩn'
                      : c.status === 'DELETED'
                      ? 'Đã xóa vĩnh viễn'
                      : 'Đã ẩn'}
                  </span>
                </td>
                <td className="text-end pe-3">
                  <div className="d-inline-flex gap-1">
                    {c.status === 'HIDDEN' && (
                      <>
                        <Button
                          variant="outline-success"
                          size="sm"
                          className="admin-action-btn"
                          onClick={() => onRestore(c.comment_id)}
                          title="Khôi phục hiển thị bình luận"
                        >
                          <i className="bi bi-arrow-counterclockwise" />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="admin-action-btn"
                          onClick={() => onDeleteClick({ comment: c, permanent: true })}
                          title="Xóa vĩnh viễn bình luận"
                        >
                          <i className="bi bi-trash3-fill" />
                        </Button>
                      </>
                    )}

                    {isPermanentDeleted && (
                      <Button
                        variant="outline-success"
                        size="sm"
                        className="admin-action-btn"
                        onClick={() => onRestore(c.comment_id)}
                        title="Khôi phục lại bình luận này"
                      >
                        <i className="bi bi-arrow-counterclockwise" />
                      </Button>
                    )}

                    {!isHidden && (
                      <Button
                        variant="outline-warning"
                        size="sm"
                        className="admin-action-btn"
                        onClick={() => onDeleteClick({ comment: c, permanent: false })}
                        title="Ẩn bình luận khỏi bài viết"
                      >
                        <i className="bi bi-eye-slash" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
