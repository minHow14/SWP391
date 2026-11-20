// D:/SWP391/SWP391/client/test/authSessionUi.test.jsx
// Kiểm thử giao diện phiên đăng nhập: ô "Ghi nhớ đăng nhập" chọn đúng nơi lưu phiên và trạng thái đăng xuất khi server lỗi.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import Header from '../src/components/layout/Header.jsx';
import AuthForm from '../src/features/auth/components/AuthForm.jsx';
import apiClient from '../src/services/apiClient.js';
import { getSession, setSession } from '../src/utils/session.js';

// Mock useDatabase đọc người dùng từ phiên thật, và ẩn chuông thông báo để Header không gọi API phụ.
vi.mock('../src/hooks/useDatabase.js', () => ({ useDatabase: () => ({ user: getSession()?.user }) }));
vi.mock('../src/components/layout/NotificationBell.jsx', () => ({ default: () => null }));
// Lưu adapter gốc của axios để khôi phục sau mỗi test.
const originalAdapter = apiClient.defaults.adapter;
// Xóa phiên/storage và giả lập API đăng nhập luôn trả về phiên thành viên.
beforeEach(() => {
  setSession(null); sessionStorage.clear(); localStorage.clear();
  apiClient.defaults.adapter = async (config) => ({ config, status: 200, headers: {}, data: {
    success: true, data: { token: 'member-token', user: { user_id: 7, role: 2, full_name: 'Tên thành viên' } },
  } });
});
afterEach(() => { cleanup(); setSession(null); apiClient.defaults.adapter = originalAdapter; });

// Render form đăng nhập trong router và điền sẵn email, mật khẩu.
function loginForm() {
  render(<MemoryRouter><Routes><Route path="/" element={<AuthForm />} /><Route path="/ho-so" element={<p>Hồ sơ</p>} /></Routes></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'member@example.invalid' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'member-password' } });
}

// Có tích "Ghi nhớ đăng nhập" thì phiên lưu ở localStorage, không tích thì lưu ở sessionStorage.
it.each([true, false])('remember checkbox actually selects persistence=%s', async (remember) => {
  loginForm();
  if (remember) fireEvent.click(screen.getByLabelText('Ghi nhớ đăng nhập'));
  fireEvent.click(screen.getByRole('button', { name: 'Đăng Nhập Ngay' }));
  await waitFor(() => expect(getSession()?.token).toBe('member-token'));
  expect(Boolean(localStorage.getItem('chayxanh-session'))).toBe(remember);
  expect(Boolean(sessionStorage.getItem('chayxanh-session'))).toBe(!remember);
});

// Server không xóa được cookie thì phiên cục bộ vẫn bị xóa, hiển thị trạng thái đang đăng xuất và nút thử lại trung thực.
it('shows a pending logout and truthful retry when the server cannot clear its cookie', async () => {
  let reject;
  // Request đăng xuất bị treo rồi bị từ chối để mô phỏng mất kết nối.
  apiClient.defaults.adapter = () => new Promise((_, fail) => { reject = fail; });
  setSession({ token: 'member', user: { user_id: 7, full_name: 'Tên thành viên' } });
  render(<MemoryRouter><Header /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
  expect(getSession()).toBeNull();
  expect(screen.getByRole('button', { name: 'Đang đăng xuất' }).disabled).toBe(true);
  await waitFor(() => expect(reject).toBeTypeOf('function'));
  await act(async () => reject(new Error('Mất kết nối.')));
  expect((await screen.findByRole('alert')).textContent).toMatch(/đã.*đăng xuất.*trình duyệt|đã xóa phiên/i);
  expect(screen.getByRole('button', { name: 'Thử đăng xuất lại' })).toBeTruthy();
});
