// D:/SWP391/SWP391/client/test/aiHistory.test.jsx
// Kiểm thử lịch sử AI đã lưu: API dùng chung có xác thực và component AiGenerationHistory (phân trang, đổi chủ sở hữu, trạng thái tải/lỗi/rỗng).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '../src/services/apiClient.js';
import { aiGenerationApi } from '../src/services/aiGenerationApi.js';
import AiGenerationHistory from '../src/features/aiHistory/components/AiGenerationHistory.jsx';

// Lưu adapter gốc của axios để khôi phục sau các test có thay adapter.
const originalAdapter = apiClient.defaults.adapter;
// Bản ghi lịch sử chat mẫu dùng chung cho các test.
const record = { id: 'history-1', type: 'CHAT', status: 'COMPLETED', createdAt: '2026-10-28T10:00:00Z',
  requestPayload: { message: 'Nấm có đạm không?' }, responsePayload: { reply: 'Nấm có chứa đạm.' } };
afterEach(() => { cleanup(); apiClient.defaults.adapter = originalAdapter; });

// Nhóm test cho lịch sử AI đã lưu.
describe('saved AI history', () => {
  // Phải dùng apiClient dùng chung (có token) với đúng route và giữ lại meta phân trang trong kết quả.
  it('uses the shared authenticated API and retains pagination metadata', async () => {
    let request;
    // Thay adapter để bắt request và trả response giả thay vì gọi server thật.
    apiClient.defaults.adapter = async (config) => {
      request = config;
      return { config, status: 200, data: { success: true, data: [record], meta: { page: 2, limit: 10, total: 11 } } };
    };
    const result = await aiGenerationApi.list({ page: 2, type: 'CHAT' });
    expect(request.url).toBe('/v1/ai-generations');
    expect(request.params).toEqual({ page: 2, type: 'CHAT' });
    expect(result).toEqual({ items: [record], meta: { page: 2, limit: 10, total: 11 } });
  });

  // Phải tải chi tiết bản ghi trước khi mở, và có nút sang trang sau khi tổng số vượt quá một trang.
  it('loads detail before opening history and exposes the next page', async () => {
    vi.spyOn(aiGenerationApi, 'list').mockResolvedValue({ items: [record], meta: { page: 1, limit: 10, total: 11 } });
    vi.spyOn(aiGenerationApi, 'get').mockResolvedValue(record);
    const onSelect = vi.fn();
    render(<AiGenerationHistory userId={7} type="CHAT" onSelect={onSelect} />);
    fireEvent.click(await screen.findByRole('button', { name: /Nấm có đạm không/ }));
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(record));
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    await waitFor(() => expect(aiGenerationApi.list).toHaveBeenLastCalledWith({ page: 2, limit: 10, type: 'CHAT' }, expect.any(AbortSignal)));
  });

  // Đổi người dùng (đăng xuất) phải ẩn lịch sử của chủ cũ ngay và bỏ qua response chi tiết đến muộn, tránh lộ dữ liệu.
  it('hides a previous owner immediately and ignores late detail responses', async () => {
    let finish;
    vi.spyOn(aiGenerationApi, 'list').mockResolvedValue({ items: [record], meta: { page: 1, limit: 10, total: 1 } });
    // Giữ request chi tiết ở trạng thái chờ để mô phỏng response về sau khi đã đổi người dùng.
    vi.spyOn(aiGenerationApi, 'get').mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const onSelect = vi.fn();
    const view = render(<AiGenerationHistory userId={7} type="CHAT" onSelect={onSelect} />);
    fireEvent.click(await screen.findByRole('button', { name: /Nấm có đạm không/ }));
    view.rerender(<AiGenerationHistory userId={null} type="CHAT" onSelect={onSelect} />);
    finish(record);
    await waitFor(() => expect(screen.queryByText('Nấm có đạm không?')).toBeNull());
    expect(onSelect).not.toHaveBeenCalled();
  });

  // Hiển thị lần lượt trạng thái đang tải, lỗi có nút thử lại, rồi trạng thái rỗng sau khi thử lại.
  it('shows recoverable loading, error and empty states', async () => {
    vi.spyOn(aiGenerationApi, 'list').mockRejectedValueOnce(new Error('Không tải được lịch sử')).mockResolvedValue({ items: [], meta: { page: 1, limit: 10, total: 0 } });
    render(<AiGenerationHistory userId={7} type="FOOD_SCAN" onSelect={vi.fn()} />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Không tải được lịch sử');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Chưa có lịch sử AI.')).toBeTruthy();
  });
});
