// client/src/components/common/SiteStatus.jsx
// Màn hình trạng thái toàn trang: đang tải dữ liệu ban đầu hoặc lỗi kết nối kèm nút thử lại.
import { Alert, Button, Spinner } from 'react-bootstrap';

// Component trạng thái: có error thì hiện thông báo lỗi và nút thử lại, ngược lại hiện spinner đang tải.
export default function SiteStatus({ error, onRetry }) {
  return (
    <main id="main-content" className="cx-site-status" tabIndex={-1}>
      <section className="cx-site-status-card" aria-labelledby="site-status-title" aria-busy={!error}>
        <span className="cx-site-status-icon">
          {error ? <i className="bi bi-wifi-off" aria-hidden="true" /> : <Spinner animation="border" role="status"><span className="visually-hidden">Đang tải</span></Spinner>}
        </span>
        <h1 id="site-status-title">{error ? 'Chưa thể kết nối ChayXanh' : 'Đang mở căn bếp xanh…'}</h1>
        {error ? <>
          <Alert variant="light" role="alert">{error}</Alert>
          <Button variant="success" onClick={onRetry}><i className="bi bi-arrow-clockwise" aria-hidden="true" /> Thử lại</Button>
        </> : <p role="status">Đang tải công thức và nội dung từ cộng đồng.</p>}
      </section>
    </main>
  );
}
