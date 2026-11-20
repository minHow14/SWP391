// D:/SWP391/SWP391/client/test/restaurantProposal.test.jsx
// Kiểm thử form đề xuất quán chay: gửi đúng phân loại mà backend chấp nhận và giữ dữ liệu khi gửi thất bại.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import RestaurantProposalForm from '../src/features/restaurants/components/RestaurantProposalForm.jsx';

afterEach(cleanup);

// Điền các trường bắt buộc của form với loại quán truyền vào.
function fillProposal(type) {
  for (const [label, value] of [
    ['Tên quán', 'Ingredient shop test fixture'], ['Tỉnh/Thành phố', 'Đà Nẵng'],
    ['Phường/Xã', 'Phường Hải Châu'], ['Số nhà, tên đường, tòa nhà', '10 Đường kiểm thử'],
    ['Phân loại', type],
  ]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

// Mỗi loại quán phải được chuyển thành cặp isIngredientShop/diet_type_id đúng như backend chấp nhận, kèm địa chỉ ghép đầy đủ.
it.each([
  ['shop', true, null], ['vegan', false, 1], ['buddhist', false, 5], ['separate', false, 4],
])('submits %s with a classification accepted unchanged by the backend', async (type, isIngredientShop, dietId) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<RestaurantProposalForm onSubmit={onSubmit} />);
  fillProposal(type);
  fireEvent.click(screen.getByRole('button', { name: 'Lưu Quán Chay' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
  const payload = onSubmit.mock.calls[0][0];
  expect(payload).toEqual({
    name: 'Ingredient shop test fixture',
    address: '10 Đường kiểm thử, Phường Hải Châu, Đà Nẵng',
    city: 'Đà Nẵng',
    isIngredientShop,
    diet_type_id: dietId,
    latitude: null,
    longitude: null,
  });
});

// Gửi thất bại thì giữ phân loại đã chọn, hiển thị lỗi và cho phép gửi lại.
it('retains the selected shop and reports submission failures for retry', async () => {
  const onSubmit = vi.fn().mockRejectedValueOnce(new Error('Không thể lưu địa điểm.'));
  render(<RestaurantProposalForm onSubmit={onSubmit} />);
  fillProposal('shop');
  fireEvent.click(screen.getByRole('button', { name: 'Lưu Quán Chay' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Không thể lưu địa điểm.');
  expect(screen.getByLabelText('Phân loại').value).toBe('shop');
  onSubmit.mockResolvedValue(undefined);
  fireEvent.click(screen.getByRole('button', { name: 'Lưu Quán Chay' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
  expect(onSubmit.mock.calls[1][0]).toMatchObject({ isIngredientShop: true, diet_type_id: null });
});
