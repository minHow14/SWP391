// client/src/routes/RouteAccessibility.jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router';

const PAGE_TITLES = {
  '/': 'Trang chủ', '/kiem-tra-mon': 'Kiểm tra món', '/doi-mon-chay': 'Đổi món chay',
  '/tu-dien-chay': 'Từ điển chay', '/cong-thuc': 'Công thức', '/cong-dong': 'Cộng đồng',
  '/quan-chay': 'Quán chay', '/nhat-ky': 'Nhật ký', '/ho-so': 'Hồ sơ',
  '/dang-nhap': 'Đăng nhập', '/dang-ky': 'Đăng ký', '/admin': 'Quản trị', '/admin/ai': 'Quản trị AI',
};

export default function RouteAccessibility() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || 'ChayXanh';

  useEffect(() => {
    document.title = `${title} | ChayXanh`;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [pathname, title]);

  return <span className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{title}</span>;
}
