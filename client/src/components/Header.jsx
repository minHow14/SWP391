import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { useDatabase } from '../lib/databaseContext.js';
import { setSession } from '../lib/api.js';

export default function Header({ dietName = 'Chọn chế độ ăn', onChangeDiet }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const {user}=useDatabase();

  const menuItems = [
    { name: 'Kiểm Tra Món', icon: 'bi-shield-fill-check', path: '/kiem-tra-mon' },
    { name: 'Đổi Món Chay', icon: 'bi-magic', path: '/doi-mon-chay' },
    { name: 'Từ Điển Chay', icon: 'bi-book-fill', path: '/tu-dien-chay' },
    { name: 'Công Thức', icon: 'bi-book-half', path: '/cong-thuc' },
    { name: 'Cộng Đồng', icon: 'bi-people-fill', path: '/cong-dong' },
    { name: 'Quán Chay', icon: 'bi-geo-alt-fill', path: '/quan-chay' },
    { name: 'Nhật Ký', icon: 'bi-pie-chart-fill', path: '/nhat-ky' },
  ];

  return (
    <header>
      <nav
        className="navbar navbar-expand-xxl home-navbar"
        aria-label="Điều hướng chính"
      >
        <div className="container-fluid">
          {/* Logo */}
          <Link className="navbar-brand home-brand" to="/">
            <span className="brand-icon">
              <i className="bi bi-leaf-fill" aria-hidden="true"></i>
            </span>

            <span>
              <strong>ChayXanh</strong>
              <small>VEGETARIAN SUPPORT</small>
            </span>
          </Link>

          {/* Menu trên màn hình nhỏ */}
          <button
            type="button"
            className="navbar-toggler"
            aria-label="Mở hoặc đóng menu"
            aria-expanded={menuOpen}
            aria-controls="navbar-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <i className="bi bi-list" aria-hidden="true"></i>
          </button>

          <div
            id="navbar-menu"
            className={`collapse navbar-collapse ${menuOpen ? 'show' : ''}`}
          >
            {/* Các mục chức năng */}
            <ul className="navbar-nav main-menu">
              {menuItems.map((item) => (
                <li className="nav-item" key={item.name}>
                  {item.path ? (
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `nav-link ${isActive ? 'cx-nav-active' : ''}`
                      }
                      onClick={() => setMenuOpen(false)}
                    >
                      <i className={`bi ${item.icon}`} aria-hidden="true" />
                      <span>{item.name}</span>
                    </NavLink>
                  ) : (
                    <button
                      type="button"
                      className="nav-link"
                      disabled
                      title="Chức năng sẽ được bổ sung sau"
                    >
                      <i className={`bi ${item.icon}`} aria-hidden="true"></i>

                      <span>{item.name}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {/* Chế độ ăn và tài khoản */}
            <div className="account-menu">
              <button
                type="button"
                className="diet-label"
                onClick={onChangeDiet}
                aria-label={`Đổi chế độ ăn: ${dietName}`}
              >
                <i className="bi bi-leaf" aria-hidden="true"></i>
                <span>{dietName}</span>
                <i className="bi bi-chevron-down" aria-hidden="true"></i>
              </button>

              <div className="account-buttons">
                {user ? <><Link to="/ho-so" className="cx-account-profile small align-self-center text-truncate" style={{maxWidth:150}} title="Mở hồ sơ cá nhân" onClick={()=>setMenuOpen(false)}><i className="bi bi-person-circle me-1" aria-hidden="true" />{user.full_name}{user.role===1?' · Admin':''}</Link><button className="btn btn-outline-success" onClick={()=>setSession(null)}>Đăng xuất</button></> : <>
                <Link to="/dang-nhap" className="btn btn-outline-success">
                  Đăng nhập
                </Link>
                <Link to="/dang-ky" className="btn btn-success">
                  Đăng ký
                </Link>
                </>}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
