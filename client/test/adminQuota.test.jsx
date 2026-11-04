// D:/SWP391/SWP391/client/test/adminQuota.test.jsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminAi from '../src/pages/admin/AdminAi.jsx';
import { adminGetGuestQuota, adminResetGuestQuota } from '../src/services/aiApi.js';
vi.mock('../src/hooks/useDatabase.js', () => ({ useDatabase: () => ({ user: { role: 1 } }) }));
vi.mock('../src/services/aiApi.js', () => ({
  adminGetGuestQuota: vi.fn(), adminResetGuestQuota: vi.fn(), adminClearChatCache: vi.fn(), adminLogStats: vi.fn(),
  adminListLogs: vi.fn(() => Promise.resolve({ items: [], total: 0, page: 1, totalPages: 0 })),
}));
const guestId = 'guest:9b166399-e426-4f48-b400-9ee734c861a1';
const usage = { guestId, used: 3, remaining: 0, dailyLimit: 3, resetsAt: '2026-11-04T00:00:00Z' };
beforeEach(() => {
  adminGetGuestQuota.mockReset().mockResolvedValue(usage);
  adminResetGuestQuota.mockReset().mockResolvedValue({ ...usage, used: 0, usedBefore: 3 });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(cleanup);
it('instructs operators to copy the cookie identity from usage and rejects legacy identities', async () => {
  render(<AdminAi />);
  fireEvent.click(screen.getByRole('tab', { name: 'Can thiệp thủ công' }));
  expect(screen.queryByText(/ip:địa-chỉ/)).toBeNull();
  expect(screen.getByText(/guestId.*usage/)).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox', { name: 'Mã khách' }), { target: { value: 'ip:127.0.0.1' } });
  expect(screen.getByRole('button', { name: 'Xem hạn mức' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Đặt lại hạn mức' }).disabled).toBe(true);
});
it('resets the exact inspected identity and clears inspection when another ID is entered', async () => {
  render(<AdminAi />);
  fireEvent.click(screen.getByRole('tab', { name: 'Can thiệp thủ công' }));
  const input = screen.getByRole('textbox', { name: 'Mã khách' });
  fireEvent.change(input, { target: { value: guestId } });
  expect(screen.getByRole('button', { name: 'Đặt lại hạn mức' }).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Xem hạn mức' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Đặt lại hạn mức' }).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Đặt lại hạn mức' }));
  await waitFor(() => expect(adminResetGuestQuota).toHaveBeenCalledWith(guestId));
  await waitFor(() => expect(input.disabled).toBe(false));
  fireEvent.change(input, { target: { value: 'guest:76b8611e-859d-4b72-a5cc-6ec5d462eacc' } });
  expect(screen.getByRole('button', { name: 'Đặt lại hạn mức' }).disabled).toBe(true);
});
