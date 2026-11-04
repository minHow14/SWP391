// D:/SWP391/SWP391/client/test/authSessionUi.test.jsx
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import Header from '../src/components/layout/Header.jsx';
import AuthForm from '../src/features/auth/components/AuthForm.jsx';
import apiClient from '../src/services/apiClient.js';
import { getSession, setSession } from '../src/utils/session.js';

vi.mock('../src/hooks/useDatabase.js', () => ({ useDatabase: () => ({ user: getSession()?.user }) }));
vi.mock('../src/components/layout/NotificationBell.jsx', () => ({ default: () => null }));
const originalAdapter = apiClient.defaults.adapter;
beforeEach(() => {
  setSession(null); sessionStorage.clear(); localStorage.clear();
  apiClient.defaults.adapter = async (config) => ({ config, status: 200, headers: {}, data: {
    success: true, data: { token: 'member-token', user: { user_id: 7, role: 2, full_name: 'Tên thành viên' } },
  } });
});
afterEach(() => { cleanup(); setSession(null); apiClient.defaults.adapter = originalAdapter; });

function loginForm() {
  render(<MemoryRouter><Routes><Route path="/" element={<AuthForm />} /><Route path="/ho-so" element={<p>Hồ sơ</p>} /></Routes></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'member@example.invalid' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'member-password' } });
}

it.each([true, false])('remember checkbox actually selects persistence=%s', async (remember) => {
  loginForm();
  if (remember) fireEvent.click(screen.getByLabelText('Ghi nhớ đăng nhập'));
  fireEvent.click(screen.getByRole('button', { name: 'Đăng Nhập Ngay' }));
  await waitFor(() => expect(getSession()?.token).toBe('member-token'));
  expect(Boolean(localStorage.getItem('chayxanh-session'))).toBe(remember);
  expect(Boolean(sessionStorage.getItem('chayxanh-session'))).toBe(!remember);
});

it('shows a pending logout and truthful retry when the server cannot clear its cookie', async () => {
  let reject;
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
