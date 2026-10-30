// D:/SWP391/SWP391/client/test/adminHealth.test.jsx
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminSystemHealthBanner from '../src/features/admin/components/AdminSystemHealthBanner.jsx';
import { adminService } from '../src/services/adminService.js';

vi.mock('../src/services/adminService.js', () => ({ adminService: { getSystemHealth: vi.fn() } }));
const response = (services) => ({ data: { checkedAt: '2026-10-30T01:30:00Z', services } });
beforeEach(() => { adminService.getSystemHealth.mockReset(); });
afterEach(cleanup);

it('shows checking state instead of claiming services are online before the request finishes', () => {
  adminService.getSystemHealth.mockReturnValue(new Promise(() => {}));
  render(<AdminSystemHealthBanner />);
  expect(screen.getByText('Đang kiểm tra kết nối…')).toBeTruthy();
  expect(screen.queryByText('Tất cả dịch vụ hoạt động bình thường')).toBeNull();
  expect(adminService.getSystemHealth).toHaveBeenCalledTimes(1);
});

it('renders actual database UP and AI DOWN without claiming inference is healthy', async () => {
  adminService.getSystemHealth.mockResolvedValue(response([{ id: 'database', status: 'UP' }, { id: 'aiService', status: 'DOWN' }]));
  render(<AdminSystemHealthBanner />);
  await screen.findByText('Có dịch vụ chưa kết nối được');
  expect(within(screen.getByRole('group', { name: 'Cơ sở dữ liệu' })).getByText('Kết nối được')).toBeTruthy();
  expect(within(screen.getByRole('group', { name: 'Dịch vụ AI' })).getByText('Không kết nối được')).toBeTruthy();
  expect(screen.queryByText('Tất cả kết nối đều sẵn sàng')).toBeNull();
});

it('reports request failures and recovers on an explicit retry', async () => {
  adminService.getSystemHealth.mockRejectedValueOnce(new Error('Không thể tải trạng thái kết nối.'))
    .mockResolvedValue(response([{ id: 'database', status: 'UP' }, { id: 'aiService', status: 'UP' }]));
  render(<AdminSystemHealthBanner />);
  expect((await screen.findByRole('alert')).textContent).toContain('Không thể tải trạng thái kết nối.');
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại' }));
  await screen.findByText('Tất cả kết nối đều sẵn sàng');
  expect(screen.queryByRole('alert')).toBeNull();
});

it('shows empty results explicitly', async () => {
  adminService.getSystemHealth.mockResolvedValue(response([]));
  render(<AdminSystemHealthBanner />);
  await screen.findByText('Chưa có kết quả kiểm tra kết nối.');
});

it('does not treat a partial response as all services being online', async () => {
  adminService.getSystemHealth.mockResolvedValue(response([{ id: 'database', status: 'UP' }]));
  render(<AdminSystemHealthBanner />);
  await screen.findByText('Chưa xác định đầy đủ trạng thái kết nối');
  expect(within(screen.getByRole('group', { name: 'Dịch vụ AI' })).getByText('Chưa xác định')).toBeTruthy();
});

it('cancels on unmount and ignores responses after the screen has closed', async () => {
  let resolve;
  adminService.getSystemHealth.mockReturnValue(new Promise((done) => { resolve = done; }));
  const { unmount } = render(<AdminSystemHealthBanner />);
  await waitFor(() => expect(adminService.getSystemHealth).toHaveBeenCalledTimes(1));
  const signal = adminService.getSystemHealth.mock.calls[0][0];
  unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => resolve(response([{ id: 'database', status: 'UP' }])));
});

it('clears old online measurements if a later check fails', async () => {
  adminService.getSystemHealth.mockResolvedValueOnce(response([{ id: 'database', status: 'UP' }, { id: 'aiService', status: 'UP' }]))
    .mockRejectedValueOnce(new Error('Kết nối đã mất.'));
  render(<AdminSystemHealthBanner />);
  await screen.findByText('Tất cả kết nối đều sẵn sàng');
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại' }));
  await screen.findByRole('alert');
  expect(screen.queryByText('Tất cả kết nối đều sẵn sàng')).toBeNull();
  expect(screen.queryByText('Kết nối được')).toBeNull();
});
