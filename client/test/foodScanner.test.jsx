// D:/SWP391/SWP391/client/test/foodScanner.test.jsx
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import FoodScanner from '../src/pages/FoodScanner.jsx';
import { analyzeFoodImage, fileToBase64 } from '../src/services/foodScannerService.js';
import { workspaceService } from '../src/services/workspaceService.js';

const context = vi.hoisted(() => ({ user: { user_id: 7 }, diet: { diet_type_id: 1 }, data: { diets: [
  { diet_type_id: 1, name: 'Thuần chay' }, { diet_type_id: 4, name: 'Chay trứng sữa' },
] } }));
vi.mock('react-router', async (original) => ({ ...await original(), useOutletContext: () => ({ diet: context.diet }) }));
vi.mock('../src/hooks/useDatabase.js', () => ({ useDatabase: () => context }));
vi.mock('../src/services/foodScannerService.js', () => ({ analyzeFoodImage: vi.fn(), fileToBase64: vi.fn() }));
vi.mock('../src/services/workspaceService.js', () => ({ workspaceService: { addDiaryEntry: vi.fn() } }));
vi.mock('../src/features/aiHistory/components/AiGenerationHistory.jsx', () => ({ default: () => null }));

const result = { dishName: 'Sườn chay', detectedScanType: 'DISH', status: 'clear', summary: 'Nhận diện từ ảnh tải lên.',
  findings: [], identifiedIngredients: ['Đậu nành'], restaurantChecklist: [], swapSuggestions: [],
  nutritionEstimate: { calories: 180, protein: 12, carbs: 18, fat: 6 } };
const draw = () => <MemoryRouter><FoodScanner /></MemoryRouter>;
beforeEach(() => {
  vi.clearAllMocks(); context.user = { user_id: 7 }; context.diet = { diet_type_id: 1 };
  fileToBase64.mockResolvedValue({ base64: 'cmVhbC1pbWFnZQ==', mimeType: 'image/png', dataUrl: 'data:image/png;base64,cmVhbC1pbWFnZQ==' });
  analyzeFoodImage.mockResolvedValue({ success: true, data: result });
  workspaceService.addDiaryEntry.mockResolvedValue({ id: 91 });
});
afterEach(cleanup);

it('follows global diet changes until the member explicitly overrides the scanner diet', async () => {
  const view = render(draw());
  context.diet = { diet_type_id: 4 }; view.rerender(draw());
  expect(screen.getByLabelText('Chế độ ăn chay áp dụng').value).toBe('4');
  await scan();
  expect(analyzeFoodImage.mock.calls[0][0].dietTypeId).toBe(4);
  fireEvent.change(screen.getByLabelText('Chế độ ăn chay áp dụng'), { target: { value: '1' } });
  context.diet = { diet_type_id: 1 }; view.rerender(draw());
  context.diet = { diet_type_id: 4 }; view.rerender(draw());
  expect(screen.getByLabelText('Chế độ ăn chay áp dụng').value).toBe('1');
});

async function scan() {
  const fileInput = document.querySelector('input[type="file"]');
  fireEvent.change(fileInput, { target: { files: [new File(['real-image'], 'meal.png', { type: 'image/png' })] } });
  await waitFor(() => expect(screen.getByRole('button', { name: /Phân tích bằng AI Vision/ }).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: /Phân tích bằng AI Vision/ }));
  await screen.findByRole('button', { name: /Lưu vào Nhật ký ăn uống/ });
}

function completeDiary() {
  fireEvent.change(screen.getByLabelText('Khẩu phần'), { target: { value: '1 đĩa 150 g' } });
  fireEvent.change(screen.getByLabelText('Bữa ăn'), { target: { value: 'LUNCH' } });
  fireEvent.change(screen.getByLabelText('Chất xơ (g)'), { target: { value: '4' } });
}

it('sends the uploaded image, removes fake demo scans, and saves only after explicit confirmation', async () => {
  render(draw());
  expect(screen.queryByRole('button', { name: /Thử ảnh mẫu/ })).toBeNull();
  await scan();
  expect(analyzeFoodImage.mock.calls[0][0].imageBase64).toBe('cmVhbC1pbWFnZQ==');
  fireEvent.click(screen.getByRole('button', { name: /Lưu vào Nhật ký ăn uống/ }));
  const dialog = await screen.findByRole('dialog');
  expect(workspaceService.addDiaryEntry).not.toHaveBeenCalled();
  expect(within(dialog).getByLabelText('Năng lượng (kcal)').value).toBe('180');
  expect(within(dialog).getByLabelText('Chất xơ (g)').value).toBe('');
  completeDiary();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận lưu' }));
  await screen.findByText(/Đã lưu món ăn vào nhật ký/);
  expect(workspaceService.addDiaryEntry).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Sườn chay', serving: '1 đĩa 150 g', group: 'LUNCH', calories: 180, protein: 12, carbs: 18, fat: 6, fiber: 4,
  }));
  analyzeFoodImage.mockResolvedValueOnce({ success: true, data: { ...result, dishName: 'Canh nấm' } });
  fireEvent.click(screen.getByRole('button', { name: /Phân tích bằng AI Vision/ }));
  await screen.findByText('Canh nấm');
  expect(screen.queryByText(/Đã lưu món ăn vào nhật ký/)).toBeNull();
});

it('keeps the form and user data when saving fails and prevents duplicate requests', async () => {
  let reject;
  workspaceService.addDiaryEntry.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
  render(draw()); await scan();
  fireEvent.click(screen.getByRole('button', { name: /Lưu vào Nhật ký ăn uống/ }));
  await screen.findByRole('dialog'); completeDiary();
  const confirm = screen.getByRole('button', { name: 'Xác nhận lưu' });
  fireEvent.click(confirm);
  await waitFor(() => expect(confirm.disabled).toBe(true));
  fireEvent.click(confirm);
  expect(workspaceService.addDiaryEntry).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('Không thể lưu nhật ký.')));
  await screen.findByText('Không thể lưu nhật ký.');
  expect(screen.getByLabelText('Khẩu phần').value).toBe('1 đĩa 150 g');
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận lưu' }));
  await screen.findByText(/Đã lưu món ăn vào nhật ký/);
});

it('requires missing nutrition to be entered rather than silently inventing zeros', async () => {
  analyzeFoodImage.mockResolvedValue({ success: true, data: { ...result, nutritionEstimate: null } });
  render(draw()); await scan();
  fireEvent.click(screen.getByRole('button', { name: /Lưu vào Nhật ký ăn uống/ }));
  await screen.findByRole('dialog'); completeDiary();
  expect(screen.getByLabelText('Năng lượng (kcal)').value).toBe('');
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận lưu' }));
  await screen.findAllByText('Vui lòng nhập số hợp lệ.');
  expect(workspaceService.addDiaryEntry).not.toHaveBeenCalled();
});

it('clears private scan results on account change and ignores late analysis responses', async () => {
  let resolve;
  analyzeFoodImage.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const view = render(draw());
  fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [new File(['x'], 'meal.png', { type: 'image/png' })] } });
  await waitFor(() => expect(screen.getByRole('button', { name: /Phân tích bằng AI Vision/ }).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: /Phân tích bằng AI Vision/ }));
  context.user = { user_id: 8 }; view.rerender(draw());
  await act(async () => resolve({ success: true, data: result }));
  expect(screen.queryByText('Nhận diện từ ảnh tải lên.')).toBeNull();
  expect(screen.queryByRole('button', { name: /Lưu vào Nhật ký ăn uống/ })).toBeNull();
});
