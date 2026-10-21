// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/community/components/ReportDialog.jsx
import { Alert, Button, Modal } from 'react-bootstrap';
import { Link } from 'react-router';
import ReportForm from './ReportForm.jsx';

const REPORT_TITLES = { post: 'Báo cáo bài viết', comment: 'Báo cáo bình luận' };

export default function ReportDialog({ target, user, onClose }) {
  return <Modal show onHide={onClose} animation={false} centered scrollable className="cx-report-dialog" aria-labelledby="community-report-title">
    <Modal.Header closeButton><Modal.Title id="community-report-title">
      <i className="bi bi-flag me-2" aria-hidden="true" />{REPORT_TITLES[target.type]}
    </Modal.Title></Modal.Header>
    <Modal.Body>
      <blockquote className="cx-report-context"><strong>{target.authorName}</strong>
        {target.title && <p className="cx-report-post-title">{target.title}</p>}
        <p className="cx-report-excerpt">{target.content}</p>
      </blockquote>
      {user ? <><Alert variant="warning" id="community-report-unavailable">
        Chức năng gửi báo cáo đang chờ kết nối API. Bạn có thể nhập lý do, nhưng báo cáo chưa thể gửi đến quản trị viên.
      </Alert><ReportForm /></> : <Alert variant="info">Vui lòng đăng nhập để báo cáo nội dung. Chức năng gửi báo cáo hiện đang chờ kết nối API.</Alert>}
    </Modal.Body>
    <Modal.Footer><Button variant="light" onClick={onClose}>Đóng</Button>
      {user ? <Button variant="danger" disabled aria-describedby="community-report-unavailable">Gửi báo cáo</Button>
        : <Button as={Link} to="/dang-nhap" variant="success" onClick={onClose}>Đăng nhập</Button>}
    </Modal.Footer>
  </Modal>;
}
