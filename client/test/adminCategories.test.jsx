// D:/SWP391/SWP391/client/test/adminCategories.test.jsx
// Kiểm thử tab quản lý danh mục: tính mức độ sử dụng từ quan hệ thực tế và form tạo danh mục chỉ gửi tên.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminCategoriesTab from '../src/features/admin/components/AdminCategoriesTab.jsx';
import { adminService } from '../src/services/adminService.js';
// Mock adminService để cung cấp danh sách danh mục cố định và theo dõi lệnh tạo danh mục.
vi.mock('../src/services/adminService.js', () => ({ adminService: { getCategories: vi.fn(), createCategory: vi.fn() } }));
// Một danh mục chưa dùng và một danh mục dùng chung cho cả công thức lẫn bài viết, để phủ cả hai nhánh hiển thị.
beforeEach(() => {
  adminService.getCategories.mockResolvedValue({ data: [
    { category_id: 1, name: 'Chay chưa sử dụng', recipes: [], post_categories: [] },
    { category_id: 2, name: 'Dùng chung', recipes: [{ recipe_id: 1 }], post_categories: [{ post_id: 1 }] },
  ] });
});
afterEach(cleanup);
// Mức độ sử dụng phải suy ra từ quan hệ recipes/post_categories, và bộ lọc theo loại phải ẩn/hiện đúng danh mục.
it('derives usage from actual relations, including shared and unused categories', async () => {
  render(<AdminCategoriesTab />);
  const unused = await screen.findByText('Chay chưa sử dụng');
  expect(within(unused.closest('tr')).getByText('Chưa sử dụng')).toBeTruthy();
  expect(within(screen.getByText('Dùng chung').closest('tr')).getByText('Công thức và bài viết')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Tên món ăn & công thức/ }));
  expect(screen.queryByText('Chay chưa sử dụng')).toBeNull();
  expect(screen.getByText('Dùng chung')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Blog \(bài viết\)/ }));
  expect(screen.getByText('Dùng chung')).toBeTruthy();
});
// Form tạo danh mục chỉ gửi tên, không hiển thị trường "nhóm phân loại" vì backend không lưu được trường này.
it('creates only a name without offering a category group that cannot be saved', async () => {
  render(<AdminCategoriesTab />);
  await screen.findByText('Chay chưa sử dụng');
  fireEvent.click(screen.getByRole('button', { name: /Thêm danh mục mới/ }));
  const modal = await screen.findByRole('dialog');
  expect(within(modal).queryByText('Nhóm phân loại:')).toBeNull();
  fireEvent.change(within(modal).getByLabelText('Tên danh mục'), { target: { value: 'Danh mục do quản trị nhập' } });
  fireEvent.click(within(modal).getByRole('button', { name: 'Tạo danh mục' }));
  expect(adminService.createCategory).toHaveBeenCalledWith({ name: 'Danh mục do quản trị nhập' });
});
