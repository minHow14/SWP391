// D:/SWP391/SWP391/client/test/adminCategories.test.jsx
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminCategoriesTab from '../src/features/admin/components/AdminCategoriesTab.jsx';
import { adminService } from '../src/services/adminService.js';
vi.mock('../src/services/adminService.js', () => ({ adminService: { getCategories: vi.fn(), createCategory: vi.fn() } }));
beforeEach(() => {
  adminService.getCategories.mockResolvedValue({ data: [
    { category_id: 1, name: 'Chay chưa sử dụng', recipes: [], post_categories: [] },
    { category_id: 2, name: 'Dùng chung', recipes: [{ recipe_id: 1 }], post_categories: [{ post_id: 1 }] },
  ] });
});
afterEach(cleanup);
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
