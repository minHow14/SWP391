// client/src/features/auth/utils/authRedirect.js
// Xác định trang đích sau khi đăng nhập/đăng ký thành công.
// role = 1 là quản trị viên -> vào trang admin; người mới đăng ký được đưa tới trang thiết lập hồ sơ.
export function getAuthDestination({ user, isRegister }) {
  if (user?.role === 1) return '/admin';
  return isRegister ? '/ho-so?setup=1' : '/';
}
