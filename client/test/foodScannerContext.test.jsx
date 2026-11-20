// D:/SWP391/SWP391/client/test/foodScannerContext.test.jsx
// Kiểm thử hook useFoodScanner: gửi dị ứng thật, hủy lần quét cũ khi ngữ cảnh đổi và vô hiệu hóa kết quả khi dữ liệu đầu vào thay đổi.
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useFoodScanner } from '../src/features/foodScanner/hooks/useFoodScanner.js';
import { analyzeFoodImage, fileToBase64 } from '../src/services/foodScannerService.js';

// Mock dịch vụ quét để điều khiển kết quả đọc ảnh và phân tích.
vi.mock('../src/services/foodScannerService.js', () => ({ analyzeFoodImage: vi.fn(), fileToBase64: vi.fn() }));
// Kết quả phân tích thành công mẫu và sự kiện submit giả cho form.
const response = { success: true, data: { dishName: 'Đậu phụ', status: 'clear' } };
const event = { preventDefault() {} };
// Mặc định đọc ảnh và phân tích đều thành công.
beforeEach(() => {
  vi.clearAllMocks();
  fileToBase64.mockResolvedValue({ base64: 'aW1hZ2U=', mimeType: 'image/png' });
  analyzeFoodImage.mockResolvedValue(response);
});
afterEach(cleanup);

// Chọn một file ảnh PNG cho hook.
async function upload(result) {
  await act(async () => result.current.selectFile(new File(['image'], 'meal.png', { type: 'image/png' })));
}

// Tên dị ứng đã lưu phải được truyền nguyên vẹn vào yêu cầu phân tích ảnh.
it('passes actual saved allergy names to image analysis', async () => {
  const { result } = renderHook(() => useFoodScanner(1, ['Đậu phộng']));
  await upload(result);
  await act(async () => result.current.analyze(event));
  expect(analyzeFoodImage.mock.calls[0][0].allergies).toEqual(['Đậu phộng']);
});

// Đổi kiểu ăn hoặc danh sách dị ứng phải hủy lần quét đang chạy và bỏ qua kết quả đến muộn, vì kết luận không còn đúng ngữ cảnh.
it.each([
  ['diet', { dietId: 4, allergies: ['Đậu phộng'] }],
  ['allergies', { dietId: 1, allergies: ['Đậu nành'] }],
])('cancels an old %s scan and ignores its late result', async (_, next) => {
  let resolve;
  analyzeFoodImage.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const { result, rerender } = renderHook(({ dietId, allergies }) => useFoodScanner(dietId, allergies), {
    initialProps: { dietId: 1, allergies: ['Đậu phộng'] },
  });
  await upload(result);
  act(() => { void result.current.analyze(event); });
  const signal = analyzeFoodImage.mock.calls[0][1];
  rerender(next);
  expect(signal.aborted).toBe(true);
  await act(async () => resolve(response));
  expect(result.current.result).toBeNull();
  expect(result.current.loading).toBe(false);
});

// Sửa bất kỳ dữ liệu đầu vào nào (tên, thành phần, loại quét, xóa ảnh) phải xóa kết quả đã có để tránh hiển thị kết luận lỗi thời.
it.each(['setName', 'setIngredients', 'setScanType', 'removePhoto'])('invalidates a finished scan when %s changes input', async (change) => {
  const { result } = renderHook(() => useFoodScanner(1));
  await upload(result);
  await act(async () => result.current.analyze(event));
  expect(result.current.result).toEqual(response.data);
  act(() => result.current[change]('new input'));
  expect(result.current.result).toBeNull();
});

// Chuyển sang kiểm tra bằng văn bản phải hủy lần quét ảnh đang chờ.
it('cancels a pending scan when switching to a text check', async () => {
  let resolve;
  analyzeFoodImage.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const { result } = renderHook(() => useFoodScanner(1));
  await upload(result);
  act(() => result.current.setIngredients('sữa tươi'));
  act(() => { void result.current.analyze(event); });
  act(() => result.current.analyzeText(event));
  expect(analyzeFoodImage.mock.calls[0][1].aborted).toBe(true);
  await act(async () => resolve(response));
  expect(result.current.result).toBeNull();
  expect(result.current.textResult.status).toBe('warning');
});

// Kết quả trong lịch sử thuộc kiểu ăn/dị ứng khác thì không hiển thị, chỉ báo lỗi ngữ cảnh không khớp.
it('does not expose historical results from another dietary or allergy context', async () => {
  const { result } = renderHook(() => useFoodScanner(1, ['Đậu phộng']));
  act(() => result.current.restore({ status: 'COMPLETED', requestPayload: { dietTypeId: 4, allergies: [] }, responsePayload: response.data }));
  await waitFor(() => expect(result.current.result).toBeNull());
  expect(result.current.error).toMatch(/chế độ ăn|dị ứng/);
});
