// D:/SWP391/SWP391/client/test/authRecovery.test.jsx
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import ForgotPassword from '../src/pages/auth/ForgotPassword.jsx';
import ResetPassword from '../src/pages/auth/ResetPassword.jsx';
import { authService } from '../src/services/authService.js';

vi.mock('../src/services/authService.js', () => ({ authService: {
  forgotPassword: vi.fn(), resetPassword: vi.fn(), login: vi.fn(), register: vi.fn(),
} }));
const token = 'a'.repeat(64);
const genericMessage = 'Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi đến email của bạn.';
beforeEach(() => {
  vi.clearAllMocks();
  authService.forgotPassword.mockResolvedValue({ success: true, message: genericMessage });
  authService.resetPassword.mockResolvedValue({ success: true, message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' });
});
afterEach(cleanup);
function drawReset(entry = `/dat-lai-mat-khau#token=${token}`) {
  render(<MemoryRouter initialEntries={[entry]}><ResetPassword /></MemoryRouter>);
}
function passwords(password = 'new-password', confirmation = password) {
  fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: confirmation } });
}

it('sends a valid email, disables duplicate requests and shows only the generic backend success', async () => {
  let resolve;
  authService.forgotPassword.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'member@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi hướng dẫn đặt lại mật khẩu' }));
  await waitFor(() => expect(authService.forgotPassword).toHaveBeenCalledWith({ email: 'member@example.invalid' }));
  expect(screen.getByRole('button', { name: 'Đang gửi yêu cầu' }).disabled).toBe(true);
  fireEvent.submit(document.querySelector('form'));
  expect(authService.forgotPassword).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ success: true, message: genericMessage }));
  expect(await screen.findByText(genericMessage)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Đăng nhập' }).getAttribute('href')).toBe('/dang-nhap');
});

it('reports unavailable email delivery truthfully and allows retry', async () => {
  authService.forgotPassword.mockRejectedValueOnce(Object.assign(new Error('Dịch vụ gửi email chưa được cấu hình. Vui lòng thử lại sau.'), { status: 503 }));
  render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'member@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi hướng dẫn đặt lại mật khẩu' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/chưa được cấu hình/);
  expect(screen.queryByText(genericMessage)).toBeNull();
  expect(screen.getByRole('button', { name: 'Gửi hướng dẫn đặt lại mật khẩu' }).disabled).toBe(false);
});

it('sends only the fragment token and confirmed new password, then offers login', async () => {
  drawReset(); passwords();
  fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
  await waitFor(() => expect(authService.resetPassword).toHaveBeenCalledWith({ token, newPassword: 'new-password' }));
  expect(await screen.findByText(/Đặt lại mật khẩu thành công/)).toBeTruthy();
  expect(screen.queryByLabelText('Mật khẩu mới')).toBeNull();
  expect(screen.getByRole('link', { name: 'Đăng nhập' }).getAttribute('href')).toBe('/dang-nhap');
  expect(document.body.textContent).not.toContain(token);
});

it.each(['/dat-lai-mat-khau', `/dat-lai-mat-khau?token=${token}`, '/dat-lai-mat-khau#token=invalid'])('rejects an invalid or missing fragment on %s', (entry) => {
  drawReset(entry);
  expect(screen.getByRole('alert').textContent).toMatch(/không hợp lệ|hết hạn/);
  expect(screen.queryByRole('button', { name: 'Đặt lại mật khẩu' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Yêu cầu liên kết mới' }).getAttribute('href')).toBe('/quen-mat-khau');
  expect(authService.resetPassword).not.toHaveBeenCalled();
});

it('validates password confirmation before any API call', async () => {
  drawReset(); passwords('new-password', 'mismatched-password');
  fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
  expect(await screen.findByText('Mật khẩu xác nhận không khớp.')).toBeTruthy();
  expect(authService.resetPassword).not.toHaveBeenCalled();
});

it('explains an expired reset token and offers a new link without claiming success', async () => {
  authService.resetPassword.mockRejectedValueOnce(Object.assign(new Error('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'), { status: 400, code: 'INVALID_RESET_TOKEN' }));
  drawReset(); passwords();
  fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/hết hạn/);
  expect(screen.getByRole('link', { name: 'Yêu cầu liên kết mới' })).toBeTruthy();
});

