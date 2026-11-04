// D:/SWP391/SWP391/client/test/adminMonitor.test.jsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminAiMonitorTab from '../src/features/admin/components/AdminAiMonitorTab.jsx';
import { adminService } from '../src/services/adminService.js';
vi.mock('../src/services/adminService.js', () => ({ adminService: { getAiModels: vi.fn(), getAiLogs: vi.fn() } }));
vi.mock('../src/features/admin/components/AdminAiModelCards.jsx', () => ({ default: () => null }));
beforeEach(() => {
  adminService.getAiModels.mockResolvedValue({ data: [] });
  adminService.getAiLogs.mockResolvedValue({ data: [{ log_id: 1, action: 'CHAT_STREAM_USER_42', status: 'SUCCESS', created_at: '2026-11-03T00:00:00Z' }], meta: { page: 1, limit: 30, total: 1 } });
});
afterEach(cleanup);
it('filters current gateway logs by supported features rather than obsolete exact actions', async () => {
  render(<AdminAiMonitorTab />);
  const feature = await screen.findByRole('combobox', { name: 'Chức năng AI' });
  fireEvent.change(feature, { target: { value: 'chatbot' } });
  await waitFor(() => expect(adminService.getAiLogs).toHaveBeenLastCalledWith({ status: '', feature: 'chatbot', page: 1, limit: 30 }));
  expect(await screen.findByText('Chatbot Tư vấn')).toBeTruthy();
  fireEvent.change(await screen.findByRole('combobox', { name: 'Chức năng AI' }), { target: { value: 'mealPlanner' } });
  await waitFor(() => expect(adminService.getAiLogs).toHaveBeenLastCalledWith(expect.objectContaining({ feature: 'mealPlanner' })));
  fireEvent.change(await screen.findByRole('combobox', { name: 'Chức năng AI' }), { target: { value: 'other' } });
  await waitFor(() => expect(adminService.getAiLogs).toHaveBeenLastCalledWith(expect.objectContaining({ feature: 'other' })));
});
