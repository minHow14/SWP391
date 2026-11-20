// D:/SWP391/SWP391/client/test/authLinks.test.jsx
// Kiểm thử form đăng nhập/đăng ký: liên kết khôi phục mật khẩu, liên kết điều khoản và giới hạn độ dài mật khẩu theo byte UTF-8.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import AuthForm from '../src/features/auth/components/AuthForm.jsx';
import { authService } from '../src/services/authService.js';
import { setSession } from '../src/utils/session.js';

// Mock authService để không gọi API thật và kiểm tra có gửi request hay không.
vi.mock('../src/services/authService.js', () => ({ authService: { login: vi.fn(), register: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks(); setSession(null);
  authService.register.mockResolvedValue({ success: true, data: { token: 'registered', user: { user_id: 7 } } });
});
afterEach(() => { cleanup(); setSession(null); });

// Form đăng nhập phải có liên kết đến trang quên mật khẩu thật.
it('login links to real password recovery', () => {
  render(<MemoryRouter><AuthForm /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Quên mật khẩu?' }).getAttribute('href')).toBe('/quen-mat-khau');
});

// Form đăng ký phải liên kết đến trang điều khoản và chính sách bảo mật thật, và bắt buộc tích đồng ý.
it('registration links to the actual legal readers and retains explicit agreement', () => {
  render(<MemoryRouter><AuthForm isRegister /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Điều khoản dịch vụ' }).getAttribute('href')).toBe('/dieu-khoan');
  expect(screen.getByRole('link', { name: 'Chính sách bảo mật' }).getAttribute('href')).toBe('/chinh-sach-bao-mat');
  expect(screen.getByRole('checkbox').required).toBe(true);
});

// Mật khẩu vượt 72 byte UTF-8 (giới hạn của bcrypt) phải bị chặn ở client trước khi gửi request.
it('registration validates the UTF8byte password limit before making a request', async () => {
  render(<MemoryRouter><AuthForm isRegister /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Tên thành viên' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'member@example.invalid' } });
  // Ký tự "đ" chiếm 2 byte nên 37 ký tự là 74 byte, vượt giới hạn dù chưa tới 72 ký tự.
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'đ'.repeat(37) } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Đăng Ký Tài Khoản' }));
  expect(await screen.findByText(/72 byte UTF-8/)).toBeTruthy();
  expect(authService.register).not.toHaveBeenCalled();
});
