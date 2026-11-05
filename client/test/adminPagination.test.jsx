// D:/SWP391/SWP391/client/test/adminPagination.test.jsx
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminMembersTab from '../src/features/admin/components/AdminMembersTab.jsx';
import AdminPostsTab from '../src/features/admin/components/AdminPostsTab.jsx';
import AdminCommentsTab from '../src/features/admin/components/AdminCommentsTab.jsx';
import AdminReportsTab from '../src/features/admin/components/AdminReportsTab.jsx';
import AdminAiMonitorTab from '../src/features/admin/components/AdminAiMonitorTab.jsx';
import { adminService } from '../src/services/adminService.js';
vi.mock('../src/services/adminService.js', () => ({ adminService: {
  getUsers: vi.fn(), getPosts: vi.fn(), getComments: vi.fn(), getReports: vi.fn(), getAiLogs: vi.fn(), getAiModels: vi.fn(),
} }));
vi.mock('../src/features/admin/components/AdminAiModelCards.jsx', () => ({ default: () => null }));
const response = (data = [], page = 1, limit = 50, total = 101) => ({ data, meta: { page, limit, total } });
beforeEach(() => {
  for (const method of Object.values(adminService)) method.mockReset().mockResolvedValue(response());
  adminService.getAiModels.mockResolvedValue({ data: [] });
});
afterEach(cleanup);
for (const [Component, method, limit] of [[AdminMembersTab, 'getUsers', 50], [AdminPostsTab, 'getPosts', 50], [AdminCommentsTab, 'getComments', 50], [AdminReportsTab, 'getReports', 50], [AdminAiMonitorTab, 'getAiLogs', 30]]) {
  it(`${method} sends pages and renders next/previous controls from server totals`, async () => {
    adminService[method].mockImplementation(({ page }) => Promise.resolve(response([], page, limit)));
    render(<Component />);
    await waitFor(() => expect(adminService[method]).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit })));
    const previous = await screen.findByRole('button', { name: 'Trang trước' });
    expect(previous.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    await waitFor(() => expect(adminService[method]).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, limit })));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Trang trước' }).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Trang trước' }));
    await waitFor(() => expect(adminService[method]).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit })));
  });
}
it('resets member filters to page one and ignores the older page response', async () => {
  let resolveOld;
  adminService.getUsers.mockResolvedValueOnce(response())
    .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
    .mockResolvedValue(response([{ user_id: 2, full_name: 'Thành viên hiện tại', status: 'LOCKED', _count: { posts: 0, comments: 0 } }]));
  render(<AdminMembersTab />);
  fireEvent.click(await screen.findByRole('button', { name: 'Trang sau' }));
  await waitFor(() => expect(adminService.getUsers).toHaveBeenCalledTimes(2));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'LOCKED' } });
  await screen.findByText('Thành viên hiện tại');
  expect(adminService.getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: 'LOCKED' }));
  await act(async () => { resolveOld(response([{ user_id: 1, full_name: 'Kết quả cũ', status: 'ACTIVE', _count: { posts: 0, comments: 0 } }], 2)); });
  expect(screen.queryByText('Kết quả cũ')).toBeNull();
  expect(screen.getByText('Thành viên hiện tại')).toBeTruthy();
});
it('returning to a previous filter still starts at page one', async () => {
  render(<AdminMembersTab />);
  fireEvent.click(await screen.findByRole('button', { name: 'Trang sau' }));
  await waitFor(() => expect(adminService.getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'LOCKED' } });
  await waitFor(() => expect(adminService.getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'LOCKED', page: 1 })));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
  await waitFor(() => expect(adminService.getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ status: '', page: 1 })));
});
