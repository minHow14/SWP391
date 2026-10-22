// client/src/features/community/components/ReportDialog.jsx
import { useState } from 'react';
import { Alert, Button, Modal, Spinner } from 'react-bootstrap';
import { Link } from 'react-router';
import ReportForm from './ReportForm.jsx';
import { createReport } from '../../../services/communityService.js';
import { emitSyncEvent } from '../../../utils/syncEvents.js';

const REPORT_TITLES = { post: 'Báo cáo bài viết', comment: 'Báo cáo bình luận' };

export default function ReportDialog({ target, user, onClose, onReportSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setError('');
    try {
      await createReport({
        postId: target?.postId,
        commentId: target?.type === 'comment' ? target?.commentId : undefined,
        reason: values.reason,
      });
      setSuccess(true);
      emitSyncEvent('REPORT_CHANGED');
      if (onReportSuccess) {
        onReportSuccess('Báo cáo của bạn đã được gửi thành công đến ban quản trị.');
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Không thể gửi báo cáo. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  const isComment = target?.type === 'comment';

  return (
    <Modal
      show
      onHide={onClose}
      animation={false}
      centered
      scrollable
      className="cx-report-dialog"
      aria-labelledby="community-report-title"
    >
      <Modal.Header closeButton>
        <Modal.Title id="community-report-title">
          <i className="bi bi-flag me-2 text-danger" aria-hidden="true" />
          {REPORT_TITLES[target?.type] || 'Báo cáo vi phạm'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <blockquote className="cx-report-context">
          <strong>{target?.authorName}</strong>
          {target?.title && <p className="cx-report-post-title">{target.title}</p>}
          <p className="cx-report-excerpt">{target?.content}</p>
        </blockquote>

        {isComment && (
          <div className="alert alert-light border py-2 px-3 small text-muted mb-3">
            <i className="bi bi-info-circle me-1 text-primary" />
            Bạn đang báo cáo riêng <strong>bình luận này</strong>. Quản trị viên sẽ chỉ xem xét và gỡ bỏ bình luận vi phạm mà không ảnh hưởng đến bài viết.
          </div>
        )}

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} className="py-2 small">
            <i className="bi bi-exclamation-triangle-fill me-2" />
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="py-2 small">
            <i className="bi bi-check-circle-fill me-2" />
            Cảm ơn bạn! Báo cáo đã được gửi tới ban quản trị để xem xét.
          </Alert>
        )}

        {user ? (
          !success && <ReportForm onSubmit={handleSubmit} isSubmitting={submitting} formId="community-report-form" />
        ) : (
          <Alert variant="info">
            Vui lòng đăng nhập để gửi báo cáo vi phạm nội dung cho ban quản trị.
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onClose} disabled={submitting}>
          {success ? 'Đóng' : 'Hủy bỏ'}
        </Button>
        {user ? (
          !success && (
            <Button
              variant="danger"
              type="submit"
              form="community-report-form"
              disabled={submitting}
              className="d-flex align-items-center gap-2"
            >
              {submitting && <Spinner size="sm" animation="border" />}
              <span>{submitting ? 'Đang gửi...' : isComment ? 'Gửi báo cáo bình luận' : 'Gửi báo cáo bài viết'}</span>
            </Button>
          )
        ) : (
          <Button as={Link} to="/dang-nhap" variant="success" onClick={onClose}>
            Đăng nhập
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
