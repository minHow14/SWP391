// client/src/features/auth/utils/authRedirect.js
export function getAuthDestination({ user, isRegister }) {
  if (user?.role === 1) return '/admin';
  return isRegister ? '/ho-so?setup=1' : '/';
}
