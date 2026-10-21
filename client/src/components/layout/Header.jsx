// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/layout/Header.jsx
import { useState } from 'react';
import { Button, Container, Nav, Navbar } from 'react-bootstrap';
import { Link, NavLink } from 'react-router';
import { useDatabase } from '../../hooks/useDatabase.js';
import { setSession } from '../../utils/session.js';

const MENU_ITEMS = [
  { name: 'Kiểm Tra Món', icon: 'bi-shield-fill-check', path: '/kiem-tra-mon' },
  { name: 'Đổi Món Chay', icon: 'bi-magic', path: '/doi-mon-chay' },
  { name: 'Từ Điển Chay', icon: 'bi-book-fill', path: '/tu-dien-chay' },
  { name: 'Công Thức', icon: 'bi-book-half', path: '/cong-thuc' },
  { name: 'Cộng Đồng', icon: 'bi-people-fill', path: '/cong-dong' },
  { name: 'Quán Chay', icon: 'bi-geo-alt-fill', path: '/quan-chay' },
  { name: 'Nhật Ký', icon: 'bi-pie-chart-fill', path: '/nhat-ky' },
];
const ADMIN_ITEM = { name: 'Quản Trị AI', icon: 'bi-speedometer2', path: '/admin/ai' };

export default function Header({ dietName = 'Chọn chế độ ăn', onChangeDiet }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useDatabase();
  const closeMenu = () => setMenuOpen(false);
  const menuItems = user?.role === 1 ? [...MENU_ITEMS, ADMIN_ITEM] : MENU_ITEMS;

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
              {menuItems.map(item => (
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
                  <Button as={Link} to={user.role === 1 ? '/admin' : '/ho-so'} variant={user.role === 1 ? 'success' : 'light'} className="cx-account-profile" onClick={closeMenu}>
                    <i className={`bi ${user.role === 1 ? 'bi-shield-shaded' : 'bi-person-circle'}`} aria-hidden="true" />
                    <span className="text-truncate">{user.role === 1 ? 'Quản trị' : user.full_name}</span>
                  </Button>
                  <Button variant="outline-secondary" className="cx-signout-button" onClick={() => { setSession(null); closeMenu(); }} aria-label="Đăng xuất" title="Đăng xuất">
                    <i className="bi bi-box-arrow-right" aria-hidden="true" />
                  </Button>
                </> : <>
                  <Button as={Link} to="/dang-nhap" variant="light" onClick={closeMenu}>Đăng nhập</Button>
                  <Button as={Link} to="/dang-ky" variant="success" onClick={closeMenu}>Đăng ký</Button>
                </>}
              </div>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
}
