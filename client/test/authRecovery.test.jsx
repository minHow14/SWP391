// D:/SWP391/SWP391/client/test/authRecovery.test.jsx
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import ForgotPassword from '../src/pages/auth/ForgotPassword.jsx';
import ResetPassword from '../src/pages/auth/ResetPassword.jsx';
import { authService } from '../src/services/authService.js';

vi.mock('../src/services/authService.js', () => ({ authService: {
  forgotPassword: vi.fn(), verifyPasswordResetOtp: vi.fn(), resetPassword: vi.fn(),
} }));
const TOKEN = 'a'.repeat(64);
const GENERIC_MESSAGE = 'Nếu email khớp với tài khoản đang hoạt động, bạn sẽ nhận được mã xác minh để đặt lại mật khẩu.';
const REQUEST_RESULT = { success: true, message: GENERIC_MESSAGE, data: { expiresInSeconds: 300, resendAfterSeconds: 60 } };
beforeEach(() => {
  vi.clearAllMocks();
  authService.forgotPassword.mockResolvedValue(REQUEST_RESULT);
  authService.verifyPasswordResetOtp.mockResolvedValue({ success: true, message: 'Đã xác minh email.', data: { token: TOKEN, expiresInSeconds: 300 } });
  authService.resetPassword.mockResolvedValue({ success: true, message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.' });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

function drawForgot() {
  render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
}
function drawReset(entry = `/dat-lai-mat-khau#token=${TOKEN}`) {
  render(<MemoryRouter initialEntries={[entry]}><ResetPassword /></MemoryRouter>);
}
async function requestOtp() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'member@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi OTP', exact: true }));
  return screen.findByLabelText('Mã OTP');
}
async function verifyOtp(otp = '012345') {
  fireEvent.change(screen.getByLabelText('Mã OTP'), { target: { value: otp } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác minh OTP' }));
  return screen.findByLabelText('Mật khẩu mới');
}
function passwords(password = 'new-password', confirmation = password) {
  fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: confirmation } });
}

it('starts with email and Gửi OTP, then reveals the OTP field in the same card with focus', async () => {
  drawForgot();
  expect(screen.queryByLabelText('Mã OTP')).toBeNull();
  expect(screen.queryByLabelText('Mật khẩu mới')).toBeNull();
  const otp = await requestOtp();
  expect(screen.getByLabelText('Email').value).toBe('member@example.invalid');
  expect(screen.getByLabelText('Email').readOnly).toBe(true);
  expect(screen.getByText(GENERIC_MESSAGE)).toBeTruthy();
  await waitFor(() => expect(document.activeElement).toBe(otp));
  expect(otp.getAttribute('autocomplete')).toBe('one-time-code');
  expect(otp.getAttribute('inputmode')).toBe('numeric');
  expect(screen.getByRole('link', { name: 'Đăng nhập' }).getAttribute('href')).toBe('/dang-nhap');
  expect(screen.getByRole('link', { name: 'Đăng nhập' }).className).toContain('btn');
});

it('verifies a pasted OTP before submitting only the in-memory grant and confirmed password', async () => {
  drawForgot(); await requestOtp(); await verifyOtp('012 345');
  expect(authService.verifyPasswordResetOtp).toHaveBeenCalledWith({ email: 'member@example.invalid', otp: '012345' });
  expect(screen.queryByLabelText('Mã OTP')).toBeNull();
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Mật khẩu mới')));
  passwords();
  fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
  await waitFor(() => expect(authService.resetPassword).toHaveBeenCalledWith({ token: TOKEN, newPassword: 'new-password' }));
  expect(await screen.findByText(/Đã đặt lại mật khẩu/)).toBeTruthy();
  expect(screen.queryByLabelText('Mật khẩu mới')).toBeNull();
  expect(document.body.textContent).not.toContain(TOKEN);
  expect(window.location.hash).not.toContain(TOKEN);
  expect(localStorage.getItem('passwordResetToken')).toBeNull();
});

it('blocks duplicate request submissions and reveals no OTP field if SMTP fails', async () => {
  let reject;
  authService.forgotPassword.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
  drawForgot();
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'member@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi OTP', exact: true }));
  await waitFor(() => expect(authService.forgotPassword).toHaveBeenCalledOnce());
  expect(screen.getByRole('button', { name: 'Đang gửi OTP' }).disabled).toBe(true);
  fireEvent.submit(document.querySelector('form'));
  await act(async () => reject(new Error('Dịch vụ đặt lại mật khẩu chưa sẵn sàng.')));
  expect(authService.forgotPassword).toHaveBeenCalledOnce();
  expect(screen.getByRole('alert').textContent).toMatch(/chưa sẵn sàng/);
  expect(screen.queryByLabelText('Mã OTP')).toBeNull();
  expect(screen.getByRole('button', { name: 'Gửi OTP', exact: true }).disabled).toBe(false);
});

it('keeps an incorrect OTP retryable and never exposes the password fields before verification', async () => {
  authService.verifyPasswordResetOtp.mockRejectedValueOnce(new Error('Mã xác minh không hợp lệ hoặc đã hết hạn.'));
  drawForgot(); await requestOtp();
  fireEvent.change(screen.getByLabelText('Mã OTP'), { target: { value: '111111' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác minh OTP' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/không hợp lệ/);
  expect(screen.queryByLabelText('Mật khẩu mới')).toBeNull();
  expect(screen.getByRole('button', { name: 'Xác minh OTP' }).disabled).toBe(false);
  await verifyOtp();
  expect(authService.resetPassword).not.toHaveBeenCalled();
});

it('rejects incomplete OTP input without submitting it to the backend', async () => {
  drawForgot(); await requestOtp();
  fireEvent.change(screen.getByLabelText('Mã OTP'), { target: { value: '12345' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác minh OTP' }));
  expect(await screen.findByText('Mã OTP phải gồm đúng 6 chữ số.')).toBeTruthy();
  expect(authService.verifyPasswordResetOtp).not.toHaveBeenCalled();
});

it('resends only after the backend cooldown and clears the previous OTP input', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  drawForgot(); await requestOtp();
  fireEvent.change(screen.getByLabelText('Mã OTP'), { target: { value: '012345' } });
  expect(screen.getByRole('button', { name: /Gửi lại mã OTP/ }).disabled).toBe(true);
  act(() => vi.setSystemTime(Date.now() + 61000));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Gửi lại mã OTP', exact: true }).disabled).toBe(false), { timeout: 2000 });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi lại mã OTP', exact: true }));
  await waitFor(() => expect(authService.forgotPassword).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByLabelText('Mã OTP').value).toBe(''));
  expect(screen.getByRole('button', { name: /Gửi lại mã OTP/ }).disabled).toBe(true);
});

it('changing email removes the OTP state and requires sending a fresh code', async () => {
  drawForgot(); await requestOtp();
  fireEvent.click(screen.getByRole('button', { name: 'Đổi email' }));
  expect(screen.queryByLabelText('Mã OTP')).toBeNull();
  expect(screen.getByLabelText('Email').readOnly).toBe(false);
  expect(screen.getByRole('button', { name: 'Gửi OTP', exact: true })).toBeTruthy();
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Email')));
});

it('validates password confirmation after OTP verification', async () => {
  drawForgot(); await requestOtp(); await verifyOtp();
  passwords('new-password', 'mismatched-password');
  fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
  expect(await screen.findByText('Mật khẩu xác nhận không khớp.')).toBeTruthy();
  expect(authService.resetPassword).not.toHaveBeenCalled();
});

it('returns to requesting a new OTP when reset permission has expired', async () => {
  authService.resetPassword.mockRejectedValueOnce(Object.assign(new Error('Phiên đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu mã OTP mới.'), { code: 'PASSWORD_RESET_TOKEN_INVALID' }));
  drawForgot(); await requestOtp(); await verifyOtp(); passwords();
  fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/hết hạn/);
  expect(screen.queryByLabelText('Mật khẩu mới')).toBeNull();
  expect(screen.getByRole('button', { name: 'Gửi OTP', exact: true })).toBeTruthy();
});

it('does not advance when the backend returns incomplete recovery metadata', async () => {
  authService.forgotPassword.mockResolvedValueOnce({ success: true, message: GENERIC_MESSAGE, data: {} });
  drawForgot();
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'member@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi OTP', exact: true }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/Phản hồi/);
  expect(screen.queryByLabelText('Mã OTP')).toBeNull();
});

it('retains existing valid fragment links without putting new OTP grants into the URL', async () => {
  drawReset(); passwords();
  fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
  await waitFor(() => expect(authService.resetPassword).toHaveBeenCalledWith({ token: TOKEN, newPassword: 'new-password' }));
});

it.each(['/dat-lai-mat-khau', `/dat-lai-mat-khau?token=${TOKEN}`, '/dat-lai-mat-khau#token=invalid'])('explains invalid legacy links on %s and offers OTP recovery', (entry) => {
  drawReset(entry);
  expect(screen.getByRole('alert').textContent).toMatch(/không hợp lệ|hết hạn/);
  expect(screen.getByRole('link', { name: 'Yêu cầu mã OTP mới' }).getAttribute('href')).toBe('/quen-mat-khau');
  expect(authService.resetPassword).not.toHaveBeenCalled();
});
