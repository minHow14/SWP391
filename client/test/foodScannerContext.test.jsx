// D:/SWP391/SWP391/client/test/foodScannerContext.test.jsx
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useFoodScanner } from '../src/features/foodScanner/hooks/useFoodScanner.js';
import { analyzeFoodImage, fileToBase64 } from '../src/services/foodScannerService.js';

vi.mock('../src/services/foodScannerService.js', () => ({ analyzeFoodImage: vi.fn(), fileToBase64: vi.fn() }));
const response = { success: true, data: { dishName: 'Đậu phụ', status: 'clear' } };
const event = { preventDefault() {} };
beforeEach(() => {
  vi.clearAllMocks();
  fileToBase64.mockResolvedValue({ base64: 'aW1hZ2U=', mimeType: 'image/png' });
  analyzeFoodImage.mockResolvedValue(response);
});
afterEach(cleanup);

async function upload(result) {
  await act(async () => result.current.selectFile(new File(['image'], 'meal.png', { type: 'image/png' })));
}

it('passes actual saved allergy names to image analysis', async () => {
  const { result } = renderHook(() => useFoodScanner(1, ['Đậu phộng']));
  await upload(result);
  await act(async () => result.current.analyze(event));
  expect(analyzeFoodImage.mock.calls[0][0].allergies).toEqual(['Đậu phộng']);
});

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

it.each(['setName', 'setIngredients', 'setScanType', 'removePhoto'])('invalidates a finished scan when %s changes input', async (change) => {
  const { result } = renderHook(() => useFoodScanner(1));
  await upload(result);
  await act(async () => result.current.analyze(event));
  expect(result.current.result).toEqual(response.data);
  act(() => result.current[change]('new input'));
  expect(result.current.result).toBeNull();
});

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

it('does not expose historical results from another dietary or allergy context', async () => {
  const { result } = renderHook(() => useFoodScanner(1, ['Đậu phộng']));
  act(() => result.current.restore({ status: 'COMPLETED', requestPayload: { dietTypeId: 4, allergies: [] }, responsePayload: response.data }));
  await waitFor(() => expect(result.current.result).toBeNull());
  expect(result.current.error).toMatch(/chế độ ăn|dị ứng/);
});
