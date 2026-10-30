// D:/SWP391/SWP391/client/test/contentModerationAdmin.test.jsx
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiModeration } from '../src/features/admin/hooks/useAiModeration.js';
import { adminService } from '../src/services/adminService.js';
import { emitSyncEvent } from '../src/utils/syncEvents.js';

vi.mock('../src/services/adminService.js', () => ({ adminService: { getAiFlaggedContent: vi.fn() } }));
const response = (posts = []) => ({ data: { posts, comments: [], totalFlagged: posts.length } });
beforeEach(() => { adminService.getAiFlaggedContent.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('administrator moderation queue lifecycle', () => {
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
