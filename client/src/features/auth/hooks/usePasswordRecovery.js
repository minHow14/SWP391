// D:/SWP391/SWP391/client/src/features/auth/hooks/usePasswordRecovery.js
import { useEffect, useRef, useState } from 'react';
import { authService } from '../../../services/authService.js';

const MILLISECONDS_PER_SECOND = 1000;
const INVALID_RESPONSE = 'Phản hồi chưa hợp lệ. Vui lòng thử lại.';
const EXPIRED_PERMISSION = 'Phiên đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu mã OTP mới.';
const validDuration = (value) => Number.isInteger(value) && value > 0;

function requireResponse(result) {
  if (!result?.success || !result.message) throw new Error(INVALID_RESPONSE);
}

export default function usePasswordRecovery({ isReset, token }) {
  const grant = useRef(token);
  const grantExpiresAt = useRef(Infinity);
  const inFlight = useRef(false);
  const [now, setNow] = useState(Date.now);
  const [state, setState] = useState({
    step: isReset ? 'password' : 'email', email: '', busy: '', error: '', notice: '', resendAt: 0, expiresAt: 0,
  });
  useEffect(() => {
    if (!['otp', 'password'].includes(state.step)) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), MILLISECONDS_PER_SECOND);
    return () => window.clearInterval(timer);
  }, [state.step]);

  async function perform(operation, task) {
    if (inFlight.current) return;
    inFlight.current = true;
    setState((current) => ({ ...current, busy: operation, error: '' }));
    try { await task(); }
    catch (error) { setState((current) => ({ ...current, error: error.message || 'Không thể xử lý yêu cầu. Vui lòng thử lại.' })); }
    finally {
      inFlight.current = false;
      setState((current) => ({ ...current, busy: '' }));
    }
  }

  function restart() {
    if (inFlight.current) return;
    grant.current = '';
    setState((current) => ({ ...current, step: 'email', notice: '', error: '', resendAt: 0, expiresAt: 0 }));
  }

  function sendOtp({ email }) {
    if (state.step === 'otp' && Date.now() < state.resendAt) return Promise.resolve();
    return perform('request', async () => {
      const address = email.trim().toLowerCase();
      const result = await authService.forgotPassword({ email: address });
      requireResponse(result);
      if (!validDuration(result.data?.expiresInSeconds) || !validDuration(result.data?.resendAfterSeconds)) throw new Error(INVALID_RESPONSE);
      grant.current = '';
      const receivedAt = Date.now();
      setNow(receivedAt);
      setState((current) => ({ ...current, step: 'otp', email: address, notice: result.message,
        resendAt: receivedAt + result.data.resendAfterSeconds * MILLISECONDS_PER_SECOND,
        expiresAt: receivedAt + result.data.expiresInSeconds * MILLISECONDS_PER_SECOND,
      }));
    });
  }

  function verifyOtp({ otp }) {
    return perform('verify', async () => {
      const result = await authService.verifyPasswordResetOtp({ email: state.email, otp });
      requireResponse(result);
      if (!/^[a-f0-9]{64}$/.test(result.data?.token || '') || !validDuration(result.data?.expiresInSeconds)) throw new Error(INVALID_RESPONSE);
      grant.current = result.data.token;
      grantExpiresAt.current = Date.now() + result.data.expiresInSeconds * MILLISECONDS_PER_SECOND;
      setState((current) => ({ ...current, step: 'password', notice: result.message }));
    });
  }

  function resetPassword({ newPassword }) {
    return perform('reset', async () => {
      try {
        if (!grant.current || Date.now() >= grantExpiresAt.current) throw Object.assign(new Error(EXPIRED_PERMISSION), { code: 'PASSWORD_RESET_TOKEN_INVALID' });
        const result = await authService.resetPassword({ token: grant.current, newPassword });
        requireResponse(result);
        grant.current = '';
        setState((current) => ({ ...current, step: 'success', notice: result.message }));
      } catch (error) {
        if (error.code === 'PASSWORD_RESET_TOKEN_INVALID') {
          grant.current = '';
          setState((current) => ({ ...current, step: 'email', notice: '', resendAt: 0, expiresAt: 0 }));
          throw new Error(EXPIRED_PERMISSION, { cause: error });
        }
        throw error;
      }
    });
  }

  return {
    ...state, sendOtp, verifyOtp, resetPassword, restart,
    resendSeconds: Math.max(0, Math.ceil((state.resendAt - now) / MILLISECONDS_PER_SECOND)),
    otpExpired: state.step === 'otp' && now >= state.expiresAt,
    invalidLink: isReset && !token,
  };
}
