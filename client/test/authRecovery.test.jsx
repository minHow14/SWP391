// D:/SWP391/SWP391/client/test/authRecovery.test.jsx
// Kiểm thử luồng quên mật khẩu bằng OTP (ForgotPassword) và trang đặt lại mật khẩu bằng liên kết cũ (ResetPassword).
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import ForgotPassword from '../src/pages/auth/ForgotPassword.jsx';
import ResetPassword from '../src/pages/auth/ResetPassword.jsx';
import { authService } from '../src/services/authService.js';

// Mock authService để điều khiển từng bước: gửi OTP, xác minh OTP, đặt lại mật khẩu.
vi.mock('../src/services/authService.js', () => ({ authService: {
  forgotPassword: vi.fn(), verifyPasswordResetOtp: vi.fn(), resetPassword: vi.fn(),
} }));
// Token đặt lại hợp lệ có định dạng 64 ký tự hex.
const TOKEN = 'a'.repeat(64);
// Thông báo chung không tiết lộ email có tồn tại hay không, nhằm chống dò tài khoản.
const GENERIC_MESSAGE = 'Nếu email khớp với tài khoản đang hoạt động, bạn sẽ nhận được mã xác minh để đặt lại mật khẩu.';
// Kết quả gửi OTP thành công kèm thời hạn mã và thời gian chờ được gửi lại.
const REQUEST_RESULT = { success: true, message: GENERIC_MESSAGE, data: { expiresInSeconds: 300, resendAfterSeconds: 60 } };
// Mặc định mọi bước đều thành công; từng test sẽ ghi đè bước cần kiểm tra lỗi.
beforeEach(() => {
  vi.clearAllMocks();
  authService.forgotPassword.mockResolvedValue(REQUEST_RESULT);
  authService.verifyPasswordResetOtp.mockResolvedValue({ success: true, message: 'Đã xác minh email.', data: { token: TOKEN, expiresInSeconds: 300 } });
  authService.resetPassword.mockResolvedValue({ success: true, message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.' });
});
// Trả lại timer thật vì có test dùng fake timer cho Date.
afterEach(() => { cleanup(); vi.useRealTimers(); });

// Render trang quên mật khẩu trong router bộ nhớ.
function drawForgot() {
  render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
}
// Render trang đặt lại mật khẩu với URL đầu vào (mặc định là liên kết có token trong fragment).
function drawReset(entry = `/dat-lai-mat-khau#token=${TOKEN}`) {
  render(<MemoryRouter initialEntries={[entry]}><ResetPassword /></MemoryRouter>);
}
// Nhập email và bấm "Gửi OTP", trả về ô nhập OTP khi nó xuất hiện.
async function requestOtp() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'member@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi OTP', exact: true }));
  return screen.findByLabelText('Mã OTP');
}
// Nhập mã OTP và bấm xác minh, trả về ô mật khẩu mới khi nó xuất hiện.
async function verifyOtp(otp = '012345') {
  fireEvent.change(screen.getByLabelText('Mã OTP'), { target: { value: otp } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác minh OTP' }));
  return screen.findByLabelText('Mật khẩu mới');
}
// Điền mật khẩu mới và mật khẩu xác nhận (mặc định trùng nhau).
function passwords(password = 'new-password', confirmation = password) {
  fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: confirmation } });
}

// Ban đầu chỉ có ô email; sau khi gửi OTP thì ô OTP hiện trong cùng thẻ, được focus và có thuộc tính hỗ trợ nhập mã một lần.
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

// OTP dán có khoảng trắng được chuẩn hóa; token chỉ giữ trong bộ nhớ, không xuất hiện trên trang, URL hay localStorage.
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

// Chặn gửi trùng khi đang chờ, và nếu gửi email (SMTP) lỗi thì không hiện ô OTP.
it('blocks duplicate request submissions and reveals no OTP field if SMTP fails', async () => {
  let reject;
  // Giữ request gửi OTP ở trạng thái chờ để thử submit lần hai trong lúc đang xử lý.
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

// OTP sai cho phép nhập lại, và các ô mật khẩu không bao giờ hiện trước khi xác minh thành công.
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

// OTP chưa đủ 6 chữ số bị báo lỗi ở client, không gửi lên backend.
it('rejects incomplete OTP input without submitting it to the backend', async () => {
  drawForgot(); await requestOtp();
  fireEvent.change(screen.getByLabelText('Mã OTP'), { target: { value: '12345' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác minh OTP' }));
  expect(await screen.findByText('Mã OTP phải gồm đúng 6 chữ số.')).toBeTruthy();
  expect(authService.verifyPasswordResetOtp).not.toHaveBeenCalled();
});

// Chỉ cho gửi lại OTP sau thời gian chờ do backend trả về, và xóa mã OTP cũ đã nhập.
it('resends only after the backend cooldown and clears the previous OTP input', async () => {
  // Chỉ giả lập Date để tua thời gian chờ mà không làm ảnh hưởng các timer khác của React.
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

// Đổi email phải xóa trạng thái OTP và yêu cầu gửi mã mới.
it('changing email removes the OTP state and requires sending a fresh code', async () => {
  drawForgot(); await requestOtp();
  fireEvent.click(screen.getByRole('button', { name: 'Đổi email' }));
  expect(screen.queryByLabelText('Mã OTP')).toBeNull();
  expect(screen.getByLabelText('Email').readOnly).toBe(false);
  expect(screen.getByRole('button', { name: 'Gửi OTP', exact: true })).toBeTruthy();
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Email')));
});

// Mật khẩu xác nhận không khớp bị báo lỗi và không gửi yêu cầu đặt lại.
it('validates password confirmation after OTP verification', async () => {
  drawForgot(); await requestOtp(); await verifyOtp();
  passwords('new-password', 'mismatched-password');
  fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
  expect(await screen.findByText('Mật khẩu xác nhận không khớp.')).toBeTruthy();
  expect(authService.resetPassword).not.toHaveBeenCalled();
});

// Quyền đặt lại hết hạn thì quay về bước yêu cầu OTP mới.
it('returns to requesting a new OTP when reset permission has expired', async () => {
  authService.resetPassword.mockRejectedValueOnce(Object.assign(new Error('Phiên đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu mã OTP mới.'), { code: 'PASSWORD_RESET_TOKEN_INVALID' }));
  drawForgot(); await requestOtp(); await verifyOtp(); passwords();
  fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/hết hạn/);
  expect(screen.queryByLabelText('Mật khẩu mới')).toBeNull();
  expect(screen.getByRole('button', { name: 'Gửi OTP', exact: true })).toBeTruthy();
});

// Backend trả thiếu thông tin thời hạn thì không chuyển sang bước nhập OTP.
it('does not advance when the backend returns incomplete recovery metadata', async () => {
  authService.forgotPassword.mockResolvedValueOnce({ success: true, message: GENERIC_MESSAGE, data: {} });
  drawForgot();
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'member@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi OTP', exact: true }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/Phản hồi/);
  expect(screen.queryByLabelText('Mã OTP')).toBeNull();
});

// Liên kết cũ có token hợp lệ trong fragment vẫn dùng được để đặt lại mật khẩu.
it('retains existing valid fragment links without putting new OTP grants into the URL', async () => {
  drawReset(); passwords();
  fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
  await waitFor(() => expect(authService.resetPassword).toHaveBeenCalledWith({ token: TOKEN, newPassword: 'new-password' }));
});

// Liên kết thiếu token, token trong query string hoặc token sai đều bị báo không hợp lệ và gợi ý yêu cầu OTP mới.
it.each(['/dat-lai-mat-khau', `/dat-lai-mat-khau?token=${TOKEN}`, '/dat-lai-mat-khau#token=invalid'])('explains invalid legacy links on %s and offers OTP recovery', (entry) => {
  drawReset(entry);
  expect(screen.getByRole('alert').textContent).toMatch(/không hợp lệ|hết hạn/);
  expect(screen.getByRole('link', { name: 'Yêu cầu mã OTP mới' }).getAttribute('href')).toBe('/quen-mat-khau');
  expect(authService.resetPassword).not.toHaveBeenCalled();
});
