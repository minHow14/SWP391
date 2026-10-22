// client/src/features/admin/components/AdminMemberContentModal.jsx
import { Modal, Spinner } from 'react-bootstrap';

export default function AdminMemberContentModal({ content, loading, onHide }) {
  return (
    <Modal show={!!content} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 fw-bold">
          Bài đăng & Bình luận của: <span className="text-success">{content?.user?.full_name}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '65vh', overflowY: 'auto' }}>
        {loading ? (
          <div className="text-center py-4"><Spinner animation="border" variant="success" /></div>
        ) : (
          <>
            <h6 className="fw-bold mb-2 text-dark">Bài viết & Video đã đăng ({content?.posts?.length || 0})</h6>
            {content?.posts?.length === 0 ? (
              <p className="text-muted small">Người dùng chưa đăng tải bài viết nào.</p>
            ) : (
              <ul className="list-group mb-3 small">
                {content?.posts?.map((p) => (
                  <li key={p.post_id} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>[{p.post_type === 'BLOG' ? 'Blog' : 'Video'}] {p.blog?.title || p.video?.title || 'Không có tiêu đề'}</span>
                    <span className={`cx-badge ${p.status === 'PUBLISHED' ? 'cx-badge-active' : 'cx-badge-locked'}`}>
                      {p.status === 'PUBLISHED' ? 'Đã duyệt' : p.status === 'HIDDEN_BY_AI' ? 'Đã ẩn' : p.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <h6 className="fw-bold mb-2 text-dark">Bình luận gần đây ({content?.comments?.length || 0})</h6>
            {content?.comments?.length === 0 ? (
              <p className="text-muted small">Người dùng chưa để lại bình luận nào.</p>
            ) : (
              <ul className="list-group small">
                {content?.comments?.map((c) => (
                  <li key={c.comment_id} className="list-group-item">
                    <div className="fw-semibold text-truncate">{c.content}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Trên bài viết: {c.post?.blog?.title || c.post?.video?.title}</div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}
