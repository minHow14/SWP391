// D:/SWP391/SWP391/client/test/ingredientPhotoScan.test.jsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IngredientPreview from '../src/features/ingredients/components/IngredientPreview.jsx';
import * as scannerService from '../src/services/foodScannerService.js';

const catalog = [
  { id: 1, name: 'Đậu hũ non', aliases: 'tofu' },
  { id: 2, name: 'Cà chua', aliases: 'tomato' },
];
const scanResult = (data) => ({ success: true, data: { dishName: 'Món thử', identifiedIngredients: [], ...data } });
const picture = (type = 'image/png') => new File([new Uint8Array([1, 2, 3])], 'nguyen-lieu.png', { type });

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mount() {
  const onSelect = vi.fn();
  const onSearch = vi.fn();
  render(<IngredientPreview ingredients={catalog} dietId={4} onSelect={onSelect} onSearch={onSearch} />);
  const choose = (file) => fireEvent.change(screen.getByLabelText('Chọn ảnh nguyên liệu'), { target: { files: [file] } });
  return { onSelect, onSearch, choose };
}

it('no longer offers the sample ingredient demo', () => {
  mount();
  expect(screen.queryByText(/Xem nguyên liệu gợi ý/)).toBeNull();
  expect(screen.getByRole('button', { name: /Tải Ảnh Nguyên Liệu/ })).toBeTruthy();
});

it('sends the photo with the selected diet and opens the single matching ingredient', async () => {
  const analyze = vi.spyOn(scannerService, 'analyzeFoodImage').mockResolvedValue(scanResult({ identifiedIngredients: ['Đậu hũ non (150g)'] }));
  const { onSelect, choose } = mount();
  choose(picture());
  expect(await screen.findByText('AI đang nhận diện nguyên liệu…')).toBeTruthy();
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith(catalog[0]));
  expect(analyze).toHaveBeenCalledWith(expect.objectContaining({ dietTypeId: 4, mimeType: 'image/png' }), expect.any(AbortSignal));
});

it('lets the user choose when several ingredients are recognised', async () => {
  vi.spyOn(scannerService, 'analyzeFoodImage').mockResolvedValue(scanResult({ identifiedIngredients: ['đậu hũ non', 'cà chua'] }));
  const { onSelect, choose } = mount();
  choose(picture());
  fireEvent.click(await screen.findByRole('button', { name: 'Cà chua' }));
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(catalog[1]);
});

it('offers a text search when the recognised ingredient is not in the dictionary', async () => {
  vi.spyOn(scannerService, 'analyzeFoodImage').mockResolvedValue(scanResult({ dishName: 'Sầu riêng', identifiedIngredients: ['Sầu riêng'] }));
  const { onSelect, onSearch, choose } = mount();
  choose(picture());
  fireEvent.click(await screen.findByRole('button', { name: /Tìm “Sầu riêng”/ }));
  expect(onSearch).toHaveBeenCalledWith('Sầu riêng');
  expect(onSelect).not.toHaveBeenCalled();
});

it('shows the server message when recognition fails', async () => {
  vi.spyOn(scannerService, 'analyzeFoodImage').mockRejectedValue(new Error('Dịch vụ AI tạm thời không khả dụng.'));
  const { choose } = mount();
  choose(picture());
  expect((await screen.findByRole('alert')).textContent).toBe('Dịch vụ AI tạm thời không khả dụng.');
});

it('rejects unsupported files without calling the AI', () => {
  const analyze = vi.spyOn(scannerService, 'analyzeFoodImage');
  const { choose } = mount();
  choose(picture('image/gif'));
  expect(screen.getByRole('alert').textContent).toBe('Chọn ảnh JPG, PNG hoặc WebP dưới 10 MB.');
  expect(analyze).not.toHaveBeenCalled();
});
