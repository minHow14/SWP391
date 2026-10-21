// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/layout/Footer.jsx
import { Container, Nav } from 'react-bootstrap';
import { Link } from 'react-router';

export default function Footer() {
  return (
    <footer className="cx-site-footer">
      <Container fluid className="cx-footer-shell">
        <div className="cx-footer-brand">
          <Link to="/" className="cx-footer-logo"><i className="bi bi-leaf-fill" aria-hidden="true" /> ChayXanh</Link>
          <p>Công thức, nguyên liệu và trải nghiệm từ cộng đồng ChayXanh.</p>
        </div>
        <Nav aria-label="Liên kết cuối trang" className="cx-footer-links">
          <Nav.Link as={Link} to="/cong-thuc">Công thức</Nav.Link>
          <Nav.Link as={Link} to="/cong-dong">Cộng đồng</Nav.Link>
          <Nav.Link as={Link} to="/quan-chay">Quán chay</Nav.Link>
          <Nav.Link as={Link} to="/nhat-ky">Nhật ký</Nav.Link>
        </Nav>
        <div className="cx-footer-bottom">
          <span>© {new Date().getFullYear()} ChayXanh</span>
          <Link to="/">Cộng Đồng Chay Xanh <i className="bi bi-arrow-up-right" aria-hidden="true" /></Link>
        </div>
      </Container>
    </footer>
  );
}
