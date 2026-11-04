// D:/SWP391/SWP391/client/src/pages/auth/ResetPassword.jsx
import { useLocation } from 'react-router';
import PasswordRecoveryForm from '../../features/auth/components/PasswordRecoveryForm.jsx';
import { getPasswordResetToken } from '../../features/auth/utils/authValidation.js';

export default function ResetPassword() {
  const { hash } = useLocation();
  const token = getPasswordResetToken(hash);
  return <PasswordRecoveryForm key={token || 'invalid'} isReset token={token} />;
}
