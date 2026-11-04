// D:/SWP391/SWP391/client/test/adminAccountRestore.test.jsx
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminMembersTab from '../src/features/admin/components/AdminMembersTab.jsx';
import { adminService } from '../src/services/adminService.js';
vi.mock('../src/services/adminService.js', () => ({ adminService: { getUsers: vi.fn(), updateUserStatus: vi.fn(), restoreUser: vi.fn() } }));
const member = { user_id: 9, full_name: 'Tài khoản khôi phục', status: 'DELETED', _count: { posts: 0, comments: 0 } };
const list = (data = [member], page = 1) => ({ data, meta: { page, limit: 50, total: 51 } });
beforeEach(() => {
  adminService.getUsers.mockReset().mockImplementation(({ page }) => Promise.resolve(list([member], page)));
  adminService.updateUserStatus.mockReset().mockResolvedValue({});
  adminService.restoreUser.mockReset().mockResolvedValue({ data: { status: 'ACTIVE' } });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(cleanup);
it('uses dedicated restore for deleted members, keeps the current page and displays skipped-content warning', async () => {
  const warning = 'Giữ nguyên 2 nội dung đã xóa vì không có trạng thái gốc trước khi xóa tài khoản.';
  let resolveRestore;
  adminService.restoreUser.mockImplementation(() => new Promise((resolve) => { resolveRestore = resolve; }));
  render(<AdminMembersTab />);
  fireEvent.click(await screen.findByRole('button', { name: 'Trang sau' }));
  await waitFor(() => expect(adminService.getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  expect(screen.queryByTitle('Mở khóa tài khoản')).toBeNull();
  fireEvent.click(await screen.findByTitle('Khôi phục tài khoản'));
  expect(adminService.restoreUser).toHaveBeenCalledWith(member.user_id);
  expect(screen.getByTitle('Khôi phục tài khoản').disabled).toBe(true);
  expect(adminService.updateUserStatus).not.toHaveBeenCalled();
  await act(async () => { resolveRestore({ data: { status: 'ACTIVE', warning } }); });
  expect(await screen.findByText(warning)).toBeTruthy();
  expect(await screen.findByText(`Đã khôi phục tài khoản của ${member.full_name}`)).toBeTruthy();
  await waitFor(() => expect(adminService.getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
});
it('shows a restore failure and allows reloading the member list', async () => {
  adminService.restoreUser.mockRejectedValue(new Error('Không thể khôi phục tài khoản'));
  render(<AdminMembersTab />);
  fireEvent.click(await screen.findByTitle('Khôi phục tài khoản'));
  expect(await screen.findByText('Không thể khôi phục tài khoản')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByTitle('Khôi phục tài khoản')).toBeTruthy();
});
it('does not send a restore when confirmation is cancelled', async () => {
  window.confirm.mockReturnValue(false);
  render(<AdminMembersTab />);
  fireEvent.click(await screen.findByTitle('Khôi phục tài khoản'));
  expect(adminService.restoreUser).not.toHaveBeenCalled();
});
for (const [status, title, nextStatus] of [['ACTIVE', 'Khóa tài khoản', 'LOCKED'], ['LOCKED', 'Mở khóa tài khoản', 'ACTIVE']]) {
  it(`${title} continues to use supported ${nextStatus} state`, async () => {
    adminService.getUsers.mockResolvedValue(list([{ ...member, status }]));
    render(<AdminMembersTab />);
    fireEvent.click(await screen.findByTitle(title));
    await waitFor(() => expect(adminService.updateUserStatus).toHaveBeenCalledWith(member.user_id, nextStatus));
    expect(adminService.restoreUser).not.toHaveBeenCalled();
  });
}
