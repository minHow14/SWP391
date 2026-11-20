// D:/SWP391/SWP391/client/test/ingredientPhotoScanLookup.test.jsx
// Kiểm thử tra cứu nguyên liệu mới bằng ảnh trên trang từ điển: tạo job, polling, làm mới danh mục và hủy khi người dùng rời đi.
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IngredientDictionary from '../src/pages/IngredientDictionary.jsx';
import { DatabaseContext } from '../src/context/databaseContext.js';
import apiClient from '../src/services/apiClient.js';
import { workspaceService } from '../src/services/workspaceService.js';
import * as scannerService from '../src/services/foodScannerService.js';

// Nguyên liệu đã lưu sau khi job tra cứu hoàn tất.
const ingredient = { id: '42', name: 'Rau muống', category: 'vegetable', plant: true, origin: 'Thực vật',
  description: 'Mô tả nguyên liệu từ kết quả AI trong kiểm thử.', cooking: 'Gợi ý sử dụng đã lưu trong kiểm thử.',
  aliases: '', image: '/api/workspace/ingredients/42/image' };
// Mã job tra cứu dạng UUID như backend trả về.
const jobId = 'c73d67b2-a177-49eb-a049-bc09161f5849';
// Tạo biên nhận job với trạng thái và nguyên liệu đã lưu (nếu có).
const receipt = (status, saved = null) => ({ success: true, data: {
  jobId, status, ingredient: saved, errorCode: null, errorMessage: null,
} });
// Tạo file ảnh PNG giả của nguyên liệu.
const photo = () => new File([new Uint8Array([1, 2, 3])], 'rau-muong.png', { type: 'image/png' });

// Host bọc trang từ điển trong DatabaseContext có hàm reload thật gọi workspaceService.getCatalog.
function DictionaryHost() {
  const [data, setData] = useState({ ingredients: [] });
  async function reload() {
    const catalog = await workspaceService.getCatalog();
    setData(catalog);
    return catalog;
  }
  return <MemoryRouter><DatabaseContext.Provider value={{ data, reload }}>
    <IngredientDictionary />
  </DatabaseContext.Provider></MemoryRouter>;
}

// Giả lập URL/dialog vì jsdom không hỗ trợ; mặc định AI nhận diện "Rau muống" và catalog trả về nguyên liệu đó.
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:ingredient-photo');
  URL.revokeObjectURL = vi.fn();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  vi.spyOn(scannerService, 'analyzeFoodImage').mockResolvedValue({ success: true,
    data: { dishName: 'Rau muống', identifiedIngredients: ['Rau muống'] } });
  vi.spyOn(workspaceService, 'getCatalog').mockResolvedValue({ ingredients: [ingredient] });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// Render trang, chọn ảnh và trả về nút tra cứu nguyên liệu vừa nhận diện.
async function recognize() {
  render(<DictionaryHost />);
  fireEvent.change(screen.getByLabelText('Chọn ảnh nguyên liệu'), { target: { files: [photo()] } });
  return screen.findByRole('button', { name: 'Tìm “Rau muống”' });
}

// Tạo job với ảnh đã tải, polling đến khi hoàn tất, rồi làm mới danh mục và mở chi tiết nguyên liệu đã lưu.
it('creates and polls a lookup with the uploaded photo, then refreshes the grid and opens saved details', async () => {
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue(receipt('PENDING'));
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue(receipt('COMPLETED', ingredient));
  fireEvent.click(await recognize());
  await waitFor(() => expect(post).toHaveBeenCalled());
  expect(post.mock.calls[0]).toMatchObject(['/v1/ingredient-lookup-jobs', {
    ingredientName: 'Rau muống', photo: { imageBase64: 'AQID', mimeType: 'image/png' },
  }, { signal: expect.any(AbortSignal) }]);
  expect(screen.getByRole('button', { name: /Đang tạo/ }).disabled).toBe(true);
  expect(await screen.findByRole('dialog', { name: 'Rau muống' }, { timeout: 4000 })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Xem chi tiết Rau muống' })).toBeTruthy();
  expect(screen.getByText(ingredient.cooking)).toBeTruthy();
  expect(get).toHaveBeenCalledWith(`/v1/ingredient-lookup-jobs/${jobId}`, expect.objectContaining({ signal: expect.any(AbortSignal) }));
});

// Nguyên liệu đã lưu thành công nhưng tải danh mục lỗi thì nút thử lại chỉ tải lại danh mục, không tạo job mới.
it('retries only the catalog refresh when the ingredient was already saved successfully', async () => {
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue(receipt('COMPLETED', ingredient));
  const get = vi.spyOn(apiClient, 'get');
  workspaceService.getCatalog.mockRejectedValueOnce(new Error('Không tải được danh mục.'));
  fireEvent.click(await recognize());
  expect((await screen.findByRole('alert')).textContent).toContain('Không tải được danh mục.');
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByRole('dialog', { name: 'Rau muống' })).toBeTruthy();
  expect(post).toHaveBeenCalledTimes(1);
  expect(get).not.toHaveBeenCalled();
});

// Job thất bại thì hiển thị lỗi, không đổi từ điển, và cho phép tạo lần thử mới.
it('shows a failed job and allows a fresh attempt without changing the dictionary first', async () => {
  const post = vi.spyOn(apiClient, 'post').mockResolvedValueOnce(receipt('PENDING'))
    .mockResolvedValueOnce(receipt('COMPLETED', ingredient));
  vi.spyOn(apiClient, 'get').mockResolvedValue({ success: true, data: {
    ...receipt('FAILED').data, errorCode: 'AI_TIMEOUT', errorMessage: 'Dịch vụ AI tạm thời không khả dụng.',
  } });
  fireEvent.click(await recognize());
  expect((await screen.findByRole('alert', {}, { timeout: 4000 })).textContent).toContain('Dịch vụ AI tạm thời không khả dụng.');
  expect(screen.queryByRole('button', { name: 'Xem chi tiết Rau muống' })).toBeNull();
  expect(workspaceService.getCatalog).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByRole('dialog', { name: 'Rau muống' })).toBeTruthy();
  expect(post).toHaveBeenCalledTimes(2);
});

// Biên nhận "hoàn tất" nhưng thiếu nguyên liệu thì báo không hợp lệ, không hiển thị dữ liệu bịa ra.
it('rejects an invalid completed receipt instead of displaying fabricated ingredient details', async () => {
  vi.spyOn(apiClient, 'post').mockResolvedValue(receipt('COMPLETED'));
  fireEvent.click(await recognize());
  expect((await screen.findByRole('alert')).textContent).toContain('Phản hồi tra cứu nguyên liệu không hợp lệ.');
  expect(workspaceService.getCatalog).not.toHaveBeenCalled();
});

// Bỏ qua bấm trùng; xóa ảnh phải hủy request tạo job và bỏ qua response đến muộn.
it('ignores duplicate clicks and a late create response after the photo is cleared', async () => {
  let finish;
  const post = vi.spyOn(apiClient, 'post').mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const button = await recognize();
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
  const signal = post.mock.calls[0][2].signal;
  fireEvent.click(screen.getByRole('button', { name: 'Xóa ảnh' }));
  expect(signal.aborted).toBe(true);
  await act(async () => finish(receipt('COMPLETED', ingredient)));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(workspaceService.getCatalog).not.toHaveBeenCalled();
  expect(screen.queryByText('rau-muong.png')).toBeNull();
});

// Unmount phải hủy polling và bỏ qua kết quả job hoàn tất muộn.
it('cancels polling on unmount and ignores late job completion', async () => {
  let finish;
  vi.spyOn(apiClient, 'post').mockResolvedValue(receipt('PENDING'));
  const get = vi.spyOn(apiClient, 'get').mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  fireEvent.click(await recognize());
  await waitFor(() => expect(get).toHaveBeenCalled(), { timeout: 4000 });
  const signal = get.mock.calls[0][1].signal;
  cleanup();
  expect(signal.aborted).toBe(true);
  await act(async () => finish(receipt('COMPLETED', ingredient)));
  expect(workspaceService.getCatalog).not.toHaveBeenCalled();
});
