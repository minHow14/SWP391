// D:/SWP391/SWP391/client/src/pages/auth/ResetPassword.jsx
// Trang đặt lại mật khẩu: lấy token từ phần hash của URL rồi hiển thị form đặt mật khẩu mới.
import { useLocation } from 'react-router';
import PasswordRecoveryForm from '../../features/auth/components/PasswordRecoveryForm.jsx';
import { getPasswordResetToken } from '../../features/auth/utils/authValidation.js';

// Component trang đặt lại mật khẩu; key theo token để form khởi tạo lại khi token thay đổi.
export default function ResetPassword() {
  const { hash } = useLocation();
  const token = getPasswordResetToken(hash);
  return <PasswordRecoveryForm key={token || 'invalid'} isReset token={token} />;
}
