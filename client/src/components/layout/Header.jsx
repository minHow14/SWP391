// D:/SWP391/SWP391/client/src/components/layout/Header.jsx
// Thanh điều hướng chính: menu tính năng, chọn chế độ ăn, thông báo, tài khoản và đăng xuất.
import { useState } from 'react';
import { Alert, Button, Container, Nav, Navbar, Spinner } from 'react-bootstrap';
import { Link, NavLink } from 'react-router';
import { useDatabase } from '../../hooks/useDatabase.js';
import { authService } from '../../services/authService.js';
import { getSessionSnapshot } from '../../utils/session.js';
import NotificationBell from './NotificationBell.jsx';

// Danh sách mục menu chính (tên, icon Bootstrap, đường dẫn).
const MENU_ITEMS = [
  { name: 'Kiểm Tra Món', icon: 'bi-shield-fill-check', path: '/kiem-tra-mon' },
  { name: 'Đổi Món Chay', icon: 'bi-magic', path: '/doi-mon-chay' },
  { name: 'Từ Điển Chay', icon: 'bi-book-fill', path: '/tu-dien-chay' },
  { name: 'Công Thức', icon: 'bi-book-half', path: '/cong-thuc' },
  { name: 'Cộng Đồng', icon: 'bi-people-fill', path: '/cong-dong' },
  { name: 'Quán Chay', icon: 'bi-geo-alt-fill', path: '/quan-chay' },
  { name: 'Nhật Ký', icon: 'bi-pie-chart-fill', path: '/nhat-ky' },
];

// Component header; dietName là tên chế độ ăn hiện tại, onChangeDiet mở hộp chọn chế độ ăn.
export default function Header({ dietName = 'Chọn chế độ ăn', onChangeDiet }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutState, setLogoutState] = useState({ pending: false, error: '' });
  const { user } = useDatabase();
  const closeMenu = () => setMenuOpen(false);

  // Đăng xuất: phiên trên trình duyệt luôn bị xóa; nếu xóa phiên trên server lỗi thì chỉ báo lỗi
  // khi danh tính chưa đổi (tránh hiện cảnh báo sai nếu người dùng đã đăng nhập tài khoản khác).
  async function signOut() {
    if (logoutState.pending) return;
    setLogoutState({ pending: true, error: '' }); closeMenu();
    const operation = authService.logout();
    const identity = getSessionSnapshot().identityRevision;
    try {
      await operation;
      setLogoutState({ pending: false, error: '' });
    } catch {
      const sameIdentity = identity === getSessionSnapshot().identityRevision;
      setLogoutState({ pending: false, error: sameIdentity ? 'Bạn đã đăng xuất khỏi trình duyệt, nhưng chưa xóa được phiên trên máy chủ. Vui lòng thử lại.' : '' });
    }
  }

  // role === 1 là quản trị viên: nút tài khoản dẫn tới trang admin thay vì hồ sơ cá nhân.
  return (
    <header className="cx-site-header">
      <a className="cx-skip-link" href="#main-content">Chuyển đến nội dung chính</a>
      <Navbar expand="xxl" expanded={menuOpen} onToggle={setMenuOpen} className="home-navbar" aria-label="Điều hướng chính">
        <Container fluid>
          <Navbar.Brand as={Link} className="home-brand" to="/" onClick={closeMenu}>
            <span className="brand-icon"><i className="bi bi-leaf-fill" aria-hidden="true" /></span>
            <span><strong>ChayXanh</strong><small>VEGETARIAN SUPPORT</small></span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="navbar-menu" label="Mở hoặc đóng menu" />
          <Navbar.Collapse id="navbar-menu">
            <Nav as="ul" className="main-menu">
              {MENU_ITEMS.map(item => (
                <Nav.Item as="li" key={item.path}>
                  <NavLink to={item.path} onClick={closeMenu} className={({ isActive }) => `nav-link ${isActive ? 'cx-nav-active' : ''}`}>
                    <i className={`bi ${item.icon}`} aria-hidden="true" /><span>{item.name}</span>
                  </NavLink>
                </Nav.Item>
              ))}
            </Nav>
            <div className="account-menu">
              <Button variant="light" className="diet-label" onClick={onChangeDiet} aria-label={`Đổi chế độ ăn: ${dietName}`}>
                <i className="bi bi-leaf" aria-hidden="true" /><span>{dietName}</span><i className="bi bi-chevron-down" aria-hidden="true" />
              </Button>
              <div className="account-buttons">
                {user ? <>
                  <NotificationBell />
                  <Button as={Link} to={user.role === 1 ? '/admin' : '/ho-so'} variant={user.role === 1 ? 'success' : 'light'} className={`cx-account-profile ${user.role === 1 ? 'text-white' : ''}`} onClick={closeMenu}>
                    <i className={`bi ${user.role === 1 ? 'bi-shield-shaded' : 'bi-person-circle'}`} aria-hidden="true" />
                    <span className="text-truncate">{user.role === 1 ? 'Quản trị' : user.full_name}</span>
                  </Button>
                </> : <>
                  <Button as={Link} to="/dang-nhap" variant="light" onClick={closeMenu}>Đăng nhập</Button>
                  <Button as={Link} to="/dang-ky" variant="success" onClick={closeMenu}>Đăng ký</Button>
                </>}
                {(user || logoutState.pending) && <Button variant="outline-secondary" className="cx-signout-button" onClick={signOut}
                  disabled={logoutState.pending} aria-label={logoutState.pending ? 'Đang đăng xuất' : 'Đăng xuất'} title="Đăng xuất">
                  {logoutState.pending ? <Spinner size="sm" animation="border" aria-hidden="true" /> : <i className="bi bi-box-arrow-right" aria-hidden="true" />}
                </Button>}
              </div>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      {logoutState.error && !user && <Alert variant="warning" className="mb-0 rounded-0">
        {logoutState.error} <Button variant="outline-secondary" size="sm" onClick={signOut} disabled={logoutState.pending}>Thử đăng xuất lại</Button>
      </Alert>}
    </header>
  );
}
