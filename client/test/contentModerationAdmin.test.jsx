// D:/SWP391/SWP391/client/test/contentModerationAdmin.test.jsx
// Kiểm thử hook useAiModeration của hàng đợi kiểm duyệt admin: polling, hủy request cũ, đồng bộ sự kiện và xử lý dữ liệu lỗi.
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiModeration } from '../src/features/admin/hooks/useAiModeration.js';
import { adminService } from '../src/services/adminService.js';
import { emitSyncEvent } from '../src/utils/syncEvents.js';

// Mock adminService để điều khiển dữ liệu hàng đợi kiểm duyệt.
vi.mock('../src/services/adminService.js', () => ({ adminService: { getAiFlaggedContent: vi.fn() } }));
// Tạo response hàng đợi với danh sách bài bị gắn cờ.
const response = (posts = []) => ({ data: { posts, comments: [], totalFlagged: posts.length } });
beforeEach(() => { adminService.getAiFlaggedContent.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

// Nhóm test vòng đời hàng đợi kiểm duyệt của admin.
describe('administrator moderation queue lifecycle', () => {
  // Hàng đợi được cập nhật định kỳ; unmount phải hủy request đang chạy và timer.
  it('updates queued items by polling and cancels the outstanding request and timer on unmount', async () => {
    vi.useFakeTimers();
    adminService.getAiFlaggedContent.mockResolvedValueOnce(response([{ post_id: 1 }])).mockResolvedValue(response());
    const { result, unmount } = renderHook(() => useAiModeration());
    await act(async () => {});
    expect(result.current.data.posts).toEqual([{ post_id: 1 }]);
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(result.current.data.posts).toEqual([]);
    const signal = adminService.getAiFlaggedContent.mock.calls.at(-1)[0];
    unmount();
    expect(signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  // Sự kiện đồng bộ kích hoạt tải lại và hủy request cũ; response cũ đến muộn bị bỏ qua, và sau unmount thì ngừng lắng nghe sự kiện.
  it('ignores a stale response after a sync refresh and unsubscribes when the screen closes', async () => {
    let resolveOld;
    adminService.getAiFlaggedContent.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValue(response([{ post_id: 2 }]));
    const { result, unmount } = renderHook(() => useAiModeration());
    const oldSignal = adminService.getAiFlaggedContent.mock.calls[0][0];
    act(() => emitSyncEvent('MODERATION_CHANGED'));
    await waitFor(() => expect(result.current.data.posts).toEqual([{ post_id: 2 }]));
    expect(oldSignal.aborted).toBe(true);
    await act(async () => { resolveOld(response([{ post_id: 1 }])); });
    expect(result.current.data.posts).toEqual([{ post_id: 2 }]);
    unmount();
    act(() => emitSyncEvent('MODERATION_CHANGED'));
    expect(adminService.getAiFlaggedContent).toHaveBeenCalledTimes(2);
  });

  // Dữ liệu sai định dạng phải báo lỗi rõ ràng và có thể khôi phục bằng thử lại thủ công.
  it('reports an invalid response and recovers through a manual retry', async () => {
    adminService.getAiFlaggedContent.mockResolvedValueOnce({ data: { posts: 'invalid', comments: [] } })
      .mockResolvedValue(response());
    const { result } = renderHook(() => useAiModeration());
    await waitFor(() => expect(result.current.error).toBe('Dữ liệu kiểm duyệt không hợp lệ.'));
    expect(result.current.loading).toBe(false);
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.error).toBe(''));
    expect(result.current.data).toEqual(response().data);
  });
});
