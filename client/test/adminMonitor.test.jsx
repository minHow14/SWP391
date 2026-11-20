// D:/SWP391/SWP391/client/test/adminMonitor.test.jsx
// Kiểm thử bộ lọc log AI theo chức năng trong tab giám sát AI của admin.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminAiMonitorTab from '../src/features/admin/components/AdminAiMonitorTab.jsx';
import { adminService } from '../src/services/adminService.js';
// Mock adminService để trả log cố định; mock thẻ mô hình để test tập trung vào bảng log.
vi.mock('../src/services/adminService.js', () => ({ adminService: { getAiModels: vi.fn(), getAiLogs: vi.fn() } }));
vi.mock('../src/features/admin/components/AdminAiModelCards.jsx', () => ({ default: () => null }));
// Một bản ghi log có action dạng gateway mới (kèm id người dùng) để kiểm tra việc phân loại theo chức năng.
beforeEach(() => {
  adminService.getAiModels.mockResolvedValue({ data: [] });
  adminService.getAiLogs.mockResolvedValue({ data: [{ log_id: 1, action: 'CHAT_STREAM_USER_42', status: 'SUCCESS', created_at: '2026-11-03T00:00:00Z' }], meta: { page: 1, limit: 30, total: 1 } });
});
afterEach(cleanup);
// Lọc log phải gửi tham số feature (chatbot, mealPlanner, other) thay vì so khớp chính xác tên action cũ đã lỗi thời.
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
