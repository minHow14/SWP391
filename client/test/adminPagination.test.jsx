// D:/SWP391/SWP391/client/test/adminPagination.test.jsx
// Kiểm thử phân trang phía server cho các tab quản trị (thành viên, bài viết, bình luận, báo cáo, log AI).
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminMembersTab from '../src/features/admin/components/AdminMembersTab.jsx';
import AdminPostsTab from '../src/features/admin/components/AdminPostsTab.jsx';
import AdminCommentsTab from '../src/features/admin/components/AdminCommentsTab.jsx';
import AdminReportsTab from '../src/features/admin/components/AdminReportsTab.jsx';
import AdminAiMonitorTab from '../src/features/admin/components/AdminAiMonitorTab.jsx';
import { adminService } from '../src/services/adminService.js';
// Mock toàn bộ hàm lấy danh sách của adminService để điều khiển meta phân trang.
vi.mock('../src/services/adminService.js', () => ({ adminService: {
  getUsers: vi.fn(), getPosts: vi.fn(), getComments: vi.fn(), getReports: vi.fn(), getAiLogs: vi.fn(), getAiModels: vi.fn(),
} }));
// Mock thẻ mô hình AI để tab giám sát không render phần không liên quan.
vi.mock('../src/features/admin/components/AdminAiModelCards.jsx', () => ({ default: () => null }));
// Tạo response phân trang; total mặc định 101 để luôn có trang kế tiếp.
const response = (data = [], page = 1, limit = 50, total = 101) => ({ data, meta: { page, limit, total } });
beforeEach(() => {
  // Mọi hàm mock mặc định trả về trang rỗng, tránh lỗi khi component gọi thêm API phụ.
  for (const method of Object.values(adminService)) method.mockReset().mockResolvedValue(response());
  adminService.getAiModels.mockResolvedValue({ data: [] });
});
afterEach(cleanup);
// Chạy cùng một kịch bản phân trang cho từng tab cùng hàm API và limit tương ứng (log AI dùng limit 30).
for (const [Component, method, limit] of [[AdminMembersTab, 'getUsers', 50], [AdminPostsTab, 'getPosts', 50], [AdminCommentsTab, 'getComments', 50], [AdminReportsTab, 'getReports', 50], [AdminAiMonitorTab, 'getAiLogs', 30]]) {
  // Nút trước/sau phải gửi đúng số trang lên server và trạng thái nút dựa trên tổng số bản ghi server trả về.
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
// Đổi bộ lọc phải quay về trang 1 và bỏ qua response của trang cũ đến muộn (tránh race condition).
it('resets member filters to page one and ignores the older page response', async () => {
  let resolveOld;
  // Lần gọi thứ hai (trang 2) bị treo để giả lập response cũ về sau response của bộ lọc mới.
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
// Quay lại bộ lọc trước đó vẫn phải bắt đầu từ trang 1, không giữ số trang cũ.
it('returning to a previous filter still starts at page one', async () => {
  render(<AdminMembersTab />);
  fireEvent.click(await screen.findByRole('button', { name: 'Trang sau' }));
  await waitFor(() => expect(adminService.getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'LOCKED' } });
  await waitFor(() => expect(adminService.getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'LOCKED', page: 1 })));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
  await waitFor(() => expect(adminService.getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ status: '', page: 1 })));
});
