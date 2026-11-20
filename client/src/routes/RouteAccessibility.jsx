// D:/SWP391/SWP391/client/src/routes/RouteAccessibility.jsx
// Hỗ trợ trợ năng khi chuyển trang: cập nhật tiêu đề tài liệu, cuộn lên đầu, chuyển focus vào nội dung chính
// và thông báo tên trang cho trình đọc màn hình.
import { useEffect } from 'react';
import { useLocation } from 'react-router';

// Bảng tiêu đề trang theo đường dẫn; đường dẫn không có trong bảng dùng tên thương hiệu mặc định.
const PAGE_TITLES = {

  '/': 'Trang chủ', '/kiem-tra-mon': 'Kiểm tra món', '/doi-mon-chay': 'Đổi món chay',
  '/tu-dien-chay': 'Từ điển chay', '/cong-thuc': 'Công thức', '/cong-dong': 'Cộng đồng',
  '/quan-chay': 'Quán chay', '/nhat-ky': 'Nhật ký', '/ho-so': 'Hồ sơ',
  '/dang-nhap': 'Đăng nhập', '/dang-ky': 'Đăng ký', '/admin': 'Quản trị', '/admin/ai': 'Quản trị AI',
  '/quen-mat-khau': 'Quên mật khẩu', '/dat-lai-mat-khau': 'Đặt lại mật khẩu',
  '/chinh-sach-bao-mat': 'Chính sách bảo mật',

};

// Component không hiển thị trực quan, chỉ phát thông báo aria-live khi đổi trang.
export default function RouteAccessibility() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || 'ChayXanh';

  // Cuộn tức thì (không mượt) để người dùng không thấy nội dung trang cũ trôi qua.
  useEffect(() => {
    document.title = `${title} | ChayXanh`;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [pathname, title]);

  return <span className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{title}</span>;
}
