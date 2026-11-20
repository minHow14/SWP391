// D:/SWP391/SWP391/client/src/features/auth/hooks/usePasswordRecovery.js
// Hook quản lý toàn bộ trạng thái luồng quên mật khẩu (email -> OTP -> mật khẩu mới) và gọi API tương ứng.
import { useEffect, useRef, useState } from 'react';
import { authService } from '../../../services/authService.js';

const MILLISECONDS_PER_SECOND = 1000;
const INVALID_RESPONSE = 'Phản hồi chưa hợp lệ. Vui lòng thử lại.';
const EXPIRED_PERMISSION = 'Phiên đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu mã OTP mới.';
// Thời lượng hợp lệ phải là số nguyên dương (giây) do server trả về.
const validDuration = (value) => Number.isInteger(value) && value > 0;

// Ném lỗi nếu phản hồi API thiếu success/message để không chuyển bước với dữ liệu hỏng.
function requireResponse(result) {
  if (!result?.success || !result.message) throw new Error(INVALID_RESPONSE);
}

// Hook khôi phục mật khẩu; trả về state hiện tại cùng các hành động sendOtp, verifyOtp, resetPassword, restart.
export default function usePasswordRecovery({ isReset, token }) {
  // Giữ token cấp quyền đặt lại mật khẩu trong ref (không đưa vào state) để tránh lộ qua render/devtools.
  const grant = useRef(token);
  const grantExpiresAt = useRef(Infinity);
  const inFlight = useRef(false);
  const [now, setNow] = useState(Date.now);
  const [state, setState] = useState({
    step: isReset ? 'password' : 'email', email: '', busy: '', error: '', notice: '', resendAt: 0, expiresAt: 0,
  });
  // Chỉ chạy đồng hồ đếm ngược khi đang ở bước OTP/mật khẩu để tính thời gian gửi lại và hết hạn.
  useEffect(() => {
    if (!['otp', 'password'].includes(state.step)) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), MILLISECONDS_PER_SECOND);
    return () => window.clearInterval(timer);
  }, [state.step]);

  // Bọc mọi thao tác gọi API: chặn chạy song song, bật cờ busy và gom lỗi thành thông báo cho người dùng.
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

  // Quay lại bước nhập email, hủy token đã cấp (ví dụ khi người dùng muốn đổi email).
  function restart() {
    if (inFlight.current) return;
    grant.current = '';
    setState((current) => ({ ...current, step: 'email', notice: '', error: '', resendAt: 0, expiresAt: 0 }));
  }

  // Gửi yêu cầu OTP về email; bỏ qua nếu chưa hết thời gian chờ gửi lại.
  function sendOtp({ email }) {
    if (state.step === 'otp' && Date.now() < state.resendAt) return Promise.resolve();
    return perform('request', async () => {
      // Chuẩn hóa email (bỏ khoảng trắng, chữ thường) để khớp với dữ liệu lưu trên server.
      const address = email.trim().toLowerCase();
      const result = await authService.forgotPassword({ email: address });
      requireResponse(result);
      if (!validDuration(result.data?.expiresInSeconds) || !validDuration(result.data?.resendAfterSeconds)) throw new Error(INVALID_RESPONSE);
      grant.current = '';
      // Tính mốc gửi lại/hết hạn theo thời điểm nhận phản hồi thay vì lúc bấm nút để tránh lệch do độ trễ mạng.
      const receivedAt = Date.now();
      setNow(receivedAt);
      setState((current) => ({ ...current, step: 'otp', email: address, notice: result.message,
        resendAt: receivedAt + result.data.resendAfterSeconds * MILLISECONDS_PER_SECOND,
        expiresAt: receivedAt + result.data.expiresInSeconds * MILLISECONDS_PER_SECOND,
      }));
    });
  }

  // Xác minh OTP; thành công thì nhận token đặt lại mật khẩu (64 ký tự hex) và chuyển sang bước nhập mật khẩu.
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

  // Đặt mật khẩu mới bằng token đã cấp; token hết hạn/không hợp lệ thì đưa người dùng về bước nhập email.
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
