// D:/SWP391/SWP391/client/test/chatPhoto.test.jsx
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useChatBox } from '../src/features/chat/hooks/useChatBox.js';
import ChatBox from '../src/features/chat/components/ChatBox.jsx';
import apiClient from '../src/services/apiClient.js';
import * as scanner from '../src/services/foodScannerService.js';
import { streamChat } from '../src/services/aiApi.js';
import { setSession } from '../src/utils/session.js';

const database = vi.hoisted(() => ({ data: { ingredients: [{ ingredient_id: 12, name: 'Đậu nành' }] }, user: null, refreshUser: vi.fn() }));
vi.mock('../src/hooks/useDatabase.js', () => ({ useDatabase: () => database }));
vi.mock('../src/services/aiApi.js', () => ({ getChatUsage: vi.fn().mockResolvedValue({ unlimited: true }), streamChat: vi.fn() }));
vi.mock('../src/features/videoRecipeSummary/hooks/useVideoRecipeSummary.js', () => ({ useVideoRecipeSummary: () => ({ busy: false }) }));
const originalAdapter = apiClient.defaults.adapter;
const answer = { success: true, data: { dishName: 'Đậu hũ sốt đậu phộng', status: 'warning', summary: 'Có đậu phộng trong phần sốt.',
  findings: [{ ingredient: 'Đậu phộng', reason: 'Trùng dị ứng đã lưu.', layer: 5, severity: 'violation' }],
  identifiedIngredients: ['Đậu hũ', 'Đậu phộng'], swapSuggestions: ['Dùng sốt mè khi không dị ứng mè.'],
  nutritionEstimate: { calories: 420, protein: 18, carbs: 32, fat: 24 } } };
let requests;
const event = () => ({ target: { files: [new File(['image'], 'meal.png', { type: 'image/png' })], value: 'meal.png' } });
beforeEach(() => {
  vi.clearAllMocks();
  database.user = { user_id: 7, health_profile: { height: 165, weight: 60 }, allergies: [{ ingredient: { name: 'Đậu phộng' } }, { ingredient_id: 12 }] };
  setSession({ token: 'member', user: database.user });
  vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: vi.fn().mockReturnValue('blob:chat-photo'), revokeObjectURL: vi.fn() }));
  requests = [];
  apiClient.defaults.adapter = async (config) => { requests.push(config); return { config, status: 200, data: answer }; };
});
afterEach(() => { cleanup(); apiClient.defaults.adapter = originalAdapter; setSession(null); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('calls the real scanner HTTP service with the selected diet and saved allergies and renders its actual result', async () => {
  render(<MemoryRouter><ChatBox dietTypeId={5} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Mở Trợ Lý Tư Vấn' }));
  fireEvent.change(screen.getByLabelText('Ảnh nguyên liệu cho chat'), { target: { files: event().target.files } });
  expect(await screen.findByText('Có đậu phộng trong phần sốt.')).toBeTruthy();
  expect(requests).toHaveLength(1);
  expect(requests[0].url).toBe('/ai/food-scanner/analyze');
  expect(JSON.parse(requests[0].data)).toMatchObject({ imageBase64: 'aW1hZ2U=', mimeType: 'image/png', dietTypeId: 5, allergies: ['Đậu phộng', 'Đậu nành'], scanType: 'AUTO' });
  expect(screen.getByText('Trùng dị ứng đã lưu.')).toBeTruthy();
  expect(screen.getByText('Dùng sốt mè khi không dị ứng mè.')).toBeTruthy();
  expect(screen.getByText(/Dinh dưỡng ước tính/)).toBeTruthy();
  expect(screen.getByRole('link', { name: /Mở trang kiểm tra món/ }).getAttribute('href')).toBe('/kiem-tra-mon');
  expect(screen.queryByRole('button', { name: /Lưu vào Nhật ký/ })).toBeNull();
});

it('blocks duplicate photos and text while the image is being read', async () => {
  let finishRead;
  vi.spyOn(scanner, 'fileToBase64').mockImplementationOnce(() => new Promise((resolve) => { finishRead = resolve; }));
  const { result } = renderHook(() => useChatBox({ dietTypeId: 1 }));
  act(() => { void result.current.attachPhoto(event()); void result.current.attachPhoto(event()); result.current.sendMessage('Gợi ý bữa chay'); });
  expect(scanner.fileToBase64).toHaveBeenCalledOnce();
  expect(result.current.busy).toBe(true);
  expect(streamChat).not.toHaveBeenCalled();
  await act(async () => { finishRead({ base64: 'aW1hZ2U=', mimeType: 'image/png' }); });
  await waitFor(() => expect(requests).toHaveLength(1));
});

it('does not interrupt an active text request with a photo or a duplicate text submission', async () => {
  let finishText;
  streamChat.mockImplementationOnce(() => new Promise((resolve) => { finishText = resolve; }));
  const reader = vi.spyOn(scanner, 'fileToBase64');
  const { result } = renderHook(() => useChatBox({ dietTypeId: 1 }));
  act(() => { result.current.sendMessage('Gợi ý bữa chay'); result.current.sendMessage('Tin trùng'); void result.current.attachPhoto(event()); });
  expect(streamChat).toHaveBeenCalledOnce();
  expect(reader).not.toHaveBeenCalled();
  await act(async () => { finishText({ remaining: 2 }); });
  expect(result.current.busy).toBe(false);
});

it('stops before a late FileReader finishes and releases the busy lock without sending the old file', async () => {
  let finishRead;
  vi.spyOn(scanner, 'fileToBase64').mockImplementationOnce(() => new Promise((resolve) => { finishRead = resolve; }));
  const { result } = renderHook(() => useChatBox({ dietTypeId: 1 }));
  act(() => { void result.current.attachPhoto(event()); });
  act(() => result.current.stopAnswer());
  expect(result.current.busy).toBe(false);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:chat-photo');
  await act(async () => { finishRead({ base64: 'aW1hZ2U=', mimeType: 'image/png' }); });
  expect(requests).toHaveLength(0);
  expect(result.current.messages.some((message) => message.result)).toBe(false);
});

it.each(['diet', 'owner', 'allergies'])('aborts and hides a late scan after the %s changes', async (change) => {
  let finishScan;
  const analyze = vi.spyOn(scanner, 'analyzeFoodImage').mockImplementationOnce(() => new Promise((resolve) => { finishScan = resolve; }));
  const { result, rerender } = renderHook(({ dietTypeId }) => useChatBox({ dietTypeId }), { initialProps: { dietTypeId: 1 } });
  act(() => { void result.current.attachPhoto(event()); });
  await waitFor(() => expect(analyze).toHaveBeenCalledOnce());
  const signal = analyze.mock.calls[0][1];
  if (change === 'owner') { database.user = { ...database.user, user_id: 8 }; setSession({ token: 'other', user: database.user }); }
  if (change === 'allergies') database.user = { ...database.user, allergies: [{ ingredient: { name: 'Mè' } }] };
  rerender({ dietTypeId: change === 'diet' ? 4 : 1 });
  expect(signal.aborted).toBe(true);
  await act(async () => { finishScan(answer); });
  expect(result.current.messages.some((message) => message.result)).toBe(false);
  expect(result.current.busy).toBe(false);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:chat-photo');
});

it('ignores a late stopped HTTP result without clearing the busy state of a newer scan', async () => {
  let finishOld;
  let finishNew;
  const analyze = vi.spyOn(scanner, 'analyzeFoodImage')
    .mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }))
    .mockImplementationOnce(() => new Promise((resolve) => { finishNew = resolve; }));
  const { result } = renderHook(() => useChatBox({ dietTypeId: 1 }));
  act(() => { void result.current.attachPhoto(event()); });
  await waitFor(() => expect(analyze).toHaveBeenCalledTimes(1));
  act(() => result.current.stopAnswer());
  act(() => { void result.current.attachPhoto(event()); });
  await waitFor(() => expect(analyze).toHaveBeenCalledTimes(2));
  await act(async () => finishOld(answer));
  expect(result.current.messages.some((message) => message.result)).toBe(false);
  expect(result.current.busy).toBe(true);
  await act(async () => finishNew(answer));
  expect(result.current.messages.filter((message) => message.result)).toHaveLength(1);
  expect(result.current.busy).toBe(false);
});

it('hides a completed verdict immediately when the selected diet changes', async () => {
  const { result, rerender } = renderHook(({ dietTypeId }) => useChatBox({ dietTypeId }), { initialProps: { dietTypeId: 1 } });
  await act(async () => result.current.attachPhoto(event()));
  expect(result.current.messages.some((message) => message.result)).toBe(true);
  rerender({ dietTypeId: 5 });
  expect(result.current.messages.some((message) => message.result)).toBe(false);
});

it('aborts on unmount and revokes the preview without sending an unread image', async () => {
  let finishRead;
  vi.spyOn(scanner, 'fileToBase64').mockImplementationOnce(() => new Promise((resolve) => { finishRead = resolve; }));
  const { result, unmount } = renderHook(() => useChatBox({ dietTypeId: 1 }));
  act(() => { void result.current.attachPhoto(event()); });
  unmount();
  await act(async () => { finishRead({ base64: 'aW1hZ2U=', mimeType: 'image/png' }); });
  expect(requests).toHaveLength(0);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:chat-photo');
});

it('blocks scans when a saved allergy cannot be resolved instead of omitting it', async () => {
  database.user = { ...database.user, allergies: [{ ingredient_id: 9999 }] };
  const { result } = renderHook(() => useChatBox({ dietTypeId: 1 }));
  await act(async () => result.current.attachPhoto(event()));
  expect(requests).toHaveLength(0);
  expect(result.current.error).toMatch(/dị ứng/);
});

it('shows a retryable server failure rather than inventing an analysis result', async () => {
  vi.spyOn(scanner, 'analyzeFoodImage').mockRejectedValue(new Error('Không thể đọc thành phần từ ảnh.'));
  const { result } = renderHook(() => useChatBox({ dietTypeId: 1 }));
  await act(async () => result.current.attachPhoto(event()));
  expect(result.current.busy).toBe(false);
  expect(result.current.messages.some((message) => message.error && message.text === 'Không thể đọc thành phần từ ảnh.')).toBe(true);
  expect(result.current.messages.some((message) => message.result)).toBe(false);
});
