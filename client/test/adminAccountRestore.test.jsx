// D:/SWP391/SWP391/client/test/adminAccountRestore.test.jsx
// Kiểm thử thao tác khôi phục / khóa / mở khóa tài khoản thành viên trong tab quản trị AdminMembersTab.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminMembersTab from '../src/features/admin/components/AdminMembersTab.jsx';
import { adminService } from '../src/services/adminService.js';
// Mock adminService để không gọi API thật và điều khiển được kết quả từng thao tác.
vi.mock('../src/services/adminService.js', () => ({ adminService: { getUsers: vi.fn(), updateUserStatus: vi.fn(), restoreUser: vi.fn() } }));
// Thành viên ở trạng thái DELETED dùng làm dữ liệu đầu vào cho các kịch bản khôi phục.
const member = { user_id: 9, full_name: 'Tài khoản khôi phục', status: 'DELETED', _count: { posts: 0, comments: 0 } };
// Tạo response phân trang; total lớn hơn limit để luôn có nút "Trang sau".
const list = (data = [member], page = 1) => ({ data, meta: { page, limit: 50, total: 51 } });
// Reset mock trước mỗi test và mặc định đồng ý hộp thoại confirm để thao tác được thực thi.
beforeEach(() => {
  adminService.getUsers.mockReset().mockImplementation(({ page }) => Promise.resolve(list([member], page)));
  adminService.updateUserStatus.mockReset().mockResolvedValue({});
  adminService.restoreUser.mockReset().mockResolvedValue({ data: { status: 'ACTIVE' } });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(cleanup);
// Tài khoản đã xóa phải dùng API khôi phục riêng (không dùng updateUserStatus), giữ nguyên trang hiện tại và hiển thị cảnh báo nội dung bị bỏ qua.
it('uses dedicated restore for deleted members, keeps the current page and displays skipped-content warning', async () => {
  const warning = 'Giữ nguyên 2 nội dung đã xóa vì không có trạng thái gốc trước khi xóa tài khoản.';
  let resolveRestore;
  // Giữ promise khôi phục ở trạng thái chờ để kiểm tra nút bị vô hiệu hóa trong lúc đang xử lý.
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
// Khi khôi phục thất bại phải hiển thị lỗi và cho phép tải lại danh sách bằng nút "Thử lại".
it('shows a restore failure and allows reloading the member list', async () => {
  adminService.restoreUser.mockRejectedValue(new Error('Không thể khôi phục tài khoản'));
  render(<AdminMembersTab />);
  fireEvent.click(await screen.findByTitle('Khôi phục tài khoản'));
  expect(await screen.findByText('Không thể khôi phục tài khoản')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByTitle('Khôi phục tài khoản')).toBeTruthy();
});
// Người dùng bấm hủy ở hộp thoại xác nhận thì không được gửi yêu cầu khôi phục.
it('does not send a restore when confirmation is cancelled', async () => {
  window.confirm.mockReturnValue(false);
  render(<AdminMembersTab />);
  fireEvent.click(await screen.findByTitle('Khôi phục tài khoản'));
  expect(adminService.restoreUser).not.toHaveBeenCalled();
});
// Với tài khoản ACTIVE/LOCKED, nút khóa/mở khóa vẫn dùng updateUserStatus với trạng thái tương ứng, không dùng API khôi phục.
for (const [status, title, nextStatus] of [['ACTIVE', 'Khóa tài khoản', 'LOCKED'], ['LOCKED', 'Mở khóa tài khoản', 'ACTIVE']]) {
  it(`${title} continues to use supported ${nextStatus} state`, async () => {
    adminService.getUsers.mockResolvedValue(list([{ ...member, status }]));
    render(<AdminMembersTab />);
    fireEvent.click(await screen.findByTitle(title));
    await waitFor(() => expect(adminService.updateUserStatus).toHaveBeenCalledWith(member.user_id, nextStatus));
    expect(adminService.restoreUser).not.toHaveBeenCalled();
  });
}
