// D:/SWP391/SWP391/client/test/ingredientPhotoScan.test.jsx
// Kiểm thử nhận diện nguyên liệu từ ảnh trong IngredientPreview: gửi ảnh, chọn nguyên liệu khớp, tra cứu nguyên liệu mới và xử lý lỗi.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IngredientPreview from '../src/features/ingredients/components/IngredientPreview.jsx';
import * as scannerService from '../src/services/foodScannerService.js';
import { ingredientLookupService } from '../src/services/ingredientLookupService.js';

// Danh mục nguyên liệu nhỏ để đối chiếu với tên AI nhận diện.
const catalog = [
  { id: 1, name: 'Đậu hũ non', aliases: 'tofu' },
  { id: 2, name: 'Cà chua', aliases: 'tomato' },
];
// Tạo kết quả quét thành công với dữ liệu ghi đè.
const scanResult = (data) => ({ success: true, data: { dishName: 'Món thử', identifiedIngredients: [], ...data } });
// Tạo file ảnh giả với kiểu MIME tùy chọn.
const picture = (type = 'image/png') => new File([new Uint8Array([1, 2, 3])], 'nguyen-lieu.png', { type });

// jsdom không hỗ trợ createObjectURL/revokeObjectURL nên cần giả lập cho ảnh xem trước.
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// Render IngredientPreview và trả về các callback cùng hàm chọn file.
function mount() {
  const onSelect = vi.fn();
  const onSaved = vi.fn();
  render(<IngredientPreview ingredients={catalog} dietId={4} onSelect={onSelect} onSaved={onSaved} />);
  const choose = (file) => fireEvent.change(screen.getByLabelText('Chọn ảnh nguyên liệu'), { target: { files: [file] } });
  return { onSelect, onSaved, choose };
}

// Không còn nút xem nguyên liệu mẫu (dữ liệu giả), chỉ có nút tải ảnh thật.
it('no longer offers the sample ingredient demo', () => {
  mount();
  expect(screen.queryByText(/Xem nguyên liệu gợi ý/)).toBeNull();
  expect(screen.getByRole('button', { name: /Tải Ảnh Nguyên Liệu/ })).toBeTruthy();
});

// Gửi ảnh kèm kiểu ăn đang chọn; nếu chỉ khớp một nguyên liệu (bỏ phần khối lượng) thì mở luôn nguyên liệu đó.
it('sends the photo with the selected diet and opens the single matching ingredient', async () => {
  const analyze = vi.spyOn(scannerService, 'analyzeFoodImage').mockResolvedValue(scanResult({ identifiedIngredients: ['Đậu hũ non (150g)'] }));
  const { onSelect, choose } = mount();
  choose(picture());
  expect(await screen.findByText('AI đang nhận diện nguyên liệu…')).toBeTruthy();
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith(catalog[0]));
  expect(analyze).toHaveBeenCalledWith(expect.objectContaining({ dietTypeId: 4, mimeType: 'image/png' }), expect.any(AbortSignal));
});

// Nhận diện được nhiều nguyên liệu thì để người dùng tự chọn.
it('lets the user choose when several ingredients are recognised', async () => {
  vi.spyOn(scannerService, 'analyzeFoodImage').mockResolvedValue(scanResult({ identifiedIngredients: ['đậu hũ non', 'cà chua'] }));
  const { onSelect, choose } = mount();
  choose(picture());
  fireEvent.click(await screen.findByRole('button', { name: 'Cà chua' }));
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(catalog[1]);
});

// Nguyên liệu nhận diện được nhưng chưa có trong từ điển thì cho tra cứu và lưu mới.
it('looks up and saves a recognised ingredient missing from the dictionary', async () => {
  vi.spyOn(scannerService, 'analyzeFoodImage').mockResolvedValue(scanResult({ dishName: 'Sầu riêng', identifiedIngredients: ['Sầu riêng'] }));
  const saved = { id: '3', name: 'Sầu riêng' };
  const create = vi.spyOn(ingredientLookupService, 'create').mockResolvedValue({ status: 'COMPLETED', ingredient: saved });
  const { onSelect, onSaved, choose } = mount();
  choose(picture());
  fireEvent.click(await screen.findByRole('button', { name: /Tìm “Sầu riêng”/ }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved, expect.any(AbortSignal)));
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ ingredientName: 'Sầu riêng' }), expect.any(AbortSignal));
  expect(onSelect).not.toHaveBeenCalled();
});

// Nhận diện lỗi thì hiển thị thông báo lỗi từ server.
it('shows the server message when recognition fails', async () => {
  vi.spyOn(scannerService, 'analyzeFoodImage').mockRejectedValue(new Error('Dịch vụ AI tạm thời không khả dụng.'));
  const { choose } = mount();
  choose(picture());
  expect((await screen.findByRole('alert')).textContent).toBe('Dịch vụ AI tạm thời không khả dụng.');
});

// File không được hỗ trợ (GIF) bị từ chối ngay, không gọi AI.
it('rejects unsupported files without calling the AI', () => {
  const analyze = vi.spyOn(scannerService, 'analyzeFoodImage');
  const { choose } = mount();
  choose(picture('image/gif'));
  expect(screen.getByRole('alert').textContent).toBe('Chọn ảnh JPG, PNG hoặc WebP dưới 10 MB.');
  expect(analyze).not.toHaveBeenCalled();
});
