// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/auth/components/AuthHeader.jsx
import { Nav } from 'react-bootstrap';
import { Link } from 'react-router';

export default function AuthHeader({ isRegister }) {
  return (
    <header className="bg-success bg-gradient text-white text-center p-4">
      <div className="d-inline-flex bg-white bg-opacity-25 rounded-4 p-3 mb-3">
        <i className="bi bi-leaf-fill fs-2" aria-hidden="true" />
      </div>
      <h1 className="h3 fw-bold">Cộng Đồng Chay Xanh</h1>
      <p className="small text-white-50">Dinh dưỡng lành mạnh &amp; Sống xanh toàn diện</p>
      <Nav className="d-flex gap-2 bg-dark bg-opacity-10 rounded-3 p-1 mt-4" aria-label="Tài khoản">
        <Nav.Link as={Link} to="/dang-nhap" className={`btn fw-semibold flex-fill ${!isRegister ? 'bg-white text-success' : 'text-white'}`} aria-current={!isRegister ? 'page' : undefined}>
          Đăng Nhập
        </Nav.Link>
        <Nav.Link as={Link} to="/dang-ky" className={`btn fw-semibold flex-fill ${isRegister ? 'bg-white text-success' : 'text-white'}`} aria-current={isRegister ? 'page' : undefined}>
          Đăng Ký
        </Nav.Link>
      </Nav>
    </header>
  );
}
