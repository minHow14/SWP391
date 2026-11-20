// D:/SWP391/SWP391/client/test/contentModeration.test.jsx
// Kiểm thử trạng thái kiểm duyệt nội dung bằng AI: hook theo dõi job, bảng trạng thái của tác giả, bảng chi tiết của admin và việc gửi bài.
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useContentModeration } from '../src/features/community/hooks/useContentModeration.js';
import ModerationStatusPanel from '../src/features/community/components/ModerationStatusPanel.jsx';
import { getContentModerationJobs, savePost } from '../src/services/communityService.js';
import AdminAiModerationTable from '../src/features/admin/components/AdminAiModerationTable.jsx';
import { usePostComposer } from '../src/features/community/hooks/usePostComposer.js';

// Mock communityService để điều khiển kết quả job kiểm duyệt và lưu bài viết.
vi.mock('../src/services/communityService.js', () => ({ getContentModerationJobs: vi.fn(), savePost: vi.fn(), uploadPostMedia: vi.fn() }));
// Job kiểm duyệt đang chờ của bài viết hiện tại, dùng làm dữ liệu gốc cho các kịch bản.
const job = { id: 'job', postId: 8, status: 'PENDING', targetStatus: 'PENDING_MODERATION', isCurrent: true, preview: 'Sườn chay' };
// Tạo response danh sách job; pending là số job còn chờ do backend đếm riêng.
const response = (items = [job], pending = 1) => ({ data: { items }, meta: { page: 1, limit: 5, total: items.length, pending } });
beforeEach(() => { getContentModerationJobs.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

// Nhóm test khôi phục trạng thái kiểm duyệt từ backend.
describe('moderation state restored from the backend', () => {
  // Khách chưa đăng nhập thì không tải job kiểm duyệt riêng tư.
  it('does not fetch private jobs for a guest', async () => {
    const { result } = renderHook(() => useContentModeration({ userId: null }));
    expect(result.current.items).toEqual([]);
    expect(getContentModerationJobs).not.toHaveBeenCalled();
  });
  // Job đang chờ thì định kỳ hỏi lại; khi hoàn tất thì báo để tải lại nội dung, và unmount phải dọn hết timer.
  it('polls pending jobs, refreshes content at completion and cancels timers on unmount', async () => {
    vi.useFakeTimers();
    getContentModerationJobs.mockResolvedValueOnce(response()).mockResolvedValueOnce(response([{ ...job, status: 'COMPLETED', applied: true }], 0));
    const onSettled = vi.fn();
    const { result, unmount } = renderHook(() => useContentModeration({ userId: 1, onSettled }));
    await act(async () => {});
    expect(result.current.items[0].status).toBe('PENDING');
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
    expect(result.current.items[0].status).toBe('COMPLETED');
    expect(onSettled).toHaveBeenCalledOnce();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  // Vẫn tiếp tục hỏi lại khi danh sách còn job chờ dù số đếm pending đọc riêng đã bằng 0 (hai giá trị có thể lệch nhau).
  it('continues polling when rows are pending but the separately read pending count is already zero', async () => {
    vi.useFakeTimers();
    getContentModerationJobs.mockResolvedValueOnce(response([job], 0))
      .mockResolvedValueOnce(response([{ ...job, status: 'COMPLETED', applied: true }], 0));
    const { result } = renderHook(() => useContentModeration({ userId: 1 }));
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
    expect(result.current.items[0].status).toBe('COMPLETED');
  });
  // Bỏ qua response của tài khoản cũ khi đã đổi tài khoản, và xóa dữ liệu riêng tư khi đăng xuất.
  it('ignores an old-account response and clears private rows on logout', async () => {
    let resolveOld;
    // Request của tài khoản cũ bị treo để trả về sau request của tài khoản mới.
    getContentModerationJobs.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce(response([{ ...job, id: 'new-owner' }], 0));
    const { result, rerender } = renderHook(({ userId }) => useContentModeration({ userId }), { initialProps: { userId: 1 } });
    rerender({ userId: 2 });
    await waitFor(() => expect(result.current.items[0]?.id).toBe('new-owner'));
    await act(async () => { resolveOld(response()); });
    expect(result.current.items[0].id).toBe('new-owner');
    rerender({ userId: null });
    expect(result.current.items).toEqual([]);
  });
  // Tải lỗi thì hiển thị lỗi và cho phép thử lại thủ công.
  it('shows a fetch error and allows a manual retry', async () => {
    getContentModerationJobs.mockRejectedValueOnce(new Error('Mất kết nối')).mockResolvedValueOnce(response([], 0));
    const { result } = renderHook(() => useContentModeration({ userId: 1 }));
    await waitFor(() => expect(result.current.error).toBe('Mất kết nối'));
    act(() => result.current.refresh());
    await waitFor(() => {
      expect(result.current.error).toBe('');
      expect(result.current.loading).toBe(false);
    });
  });
});

// Nhóm test bảng trạng thái kiểm duyệt dành cho tác giả.
describe('owner moderation status panel', () => {
  // Tạo state giả cho bảng trạng thái, cho phép ghi đè từng phần.
  const view = (patch = {}) => ({ items: [], meta: { total: 0, limit: 5, pending: 0 }, page: 1,
    loading: false, error: '', refresh: vi.fn(), setPage: vi.fn(), ...patch });
  // Hiển thị trung thực các trạng thái đang tải, rỗng và lỗi có nút thử lại.
  it('shows honest loading, empty and retry states', () => {
    const state = view({ loading: true });
    const { rerender } = render(<ModerationStatusPanel moderation={state} />);
    expect(screen.getByRole('status').textContent).toContain('Đang tải');
    rerender(<ModerationStatusPanel moderation={view()} />);
    expect(screen.getByText('Chưa có yêu cầu kiểm duyệt.')).toBeTruthy();
    rerender(<ModerationStatusPanel moderation={{ ...state, loading: false, error: 'Mất kết nối' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(state.refresh).toHaveBeenCalledOnce();
  });
  // Phân biệt chờ admin xem xét, kiểm tra lỗi và phiên bản cũ, không khẳng định bài đã được công khai.
  it('distinguishes review, failed and obsolete decisions without claiming publication', () => {
    const rows = [
      { ...job, status: 'COMPLETED', applied: true, targetStatus: 'HIDDEN_BY_AI', result: { decision: 'REVIEW', reason: 'Có lời chào bán thịt.' } },
      { ...job, id: 'failed', status: 'FAILED', errorMessage: 'Chưa thể kiểm tra.' },
      { ...job, id: 'older', status: 'COMPLETED', isCurrent: false, result: { decision: 'ALLOW', reason: 'Kết quả bản cũ.' } },
    ];
    render(<ModerationStatusPanel moderation={view({ items: rows, meta: { total: 3, limit: 5, pending: 0 } })} />);
    expect(screen.getByText('Chờ Admin xem xét')).toBeTruthy();
    expect(screen.getByText('Kiểm tra gặp lỗi')).toBeTruthy();
    expect(screen.getByText('Phiên bản cũ')).toBeTruthy();
    expect(screen.queryByText('Đã công khai')).toBeNull();
  });
});

// Nhóm test bảng chi tiết kiểm duyệt dành cho admin.
describe('administrator moderation details', () => {
  // Hiển thị lý do/bằng chứng đã lưu, phân biệt lỗi kiểm tra với vi phạm phát hiện được, và gửi kèm phiên bản nội dung khi duyệt.
  it('shows saved reasons/evidence and distinguishes failures from findings', () => {
    const onAction = vi.fn();
    render(<AdminAiModerationTable entityType="POST" onAction={onAction} items={[
      { post_id: 1, moderationVersion: 2, status: 'HIDDEN_BY_AI', blog: { title: 'Bài cần xem xét', content: 'Chào bán thịt.' },
        moderation: { status: 'COMPLETED', applied: true, result: { decision: 'REVIEW', reason: 'Quảng bá món có thịt.', evidence: ['Chào bán thịt.'] } } },
      { post_id: 2, status: 'PENDING_MODERATION', blog: { title: 'Bài chờ kiểm tra' },
        moderation: { status: 'FAILED', errorMessage: 'Không thể kết nối dịch vụ AI.' } },
    ]} />);
    expect(screen.getByText('Quảng bá món có thịt.')).toBeTruthy();
    expect(screen.getByText('Không thể kết nối dịch vụ AI.')).toBeTruthy();
    expect(screen.getByText('Kiểm tra gặp lỗi')).toBeTruthy();
    expect(screen.queryByText('Phát hiện từ khóa nghi vấn')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Cho phép hiển thị' })[0]);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ contentVersion: 2, id: 1, action: 'APPROVE' }));
  });
});

// Nhóm test gửi bài blog khi không chọn danh mục (danh mục là tùy chọn).
describe('blog submission without an optional category', () => {
  // Bài hợp lệ không có danh mục vẫn được gửi và giữ lại thông tin job kiểm duyệt trả về.
  it('submits a valid post and keeps its moderation receipt when no category is selected', async () => {
    savePost.mockResolvedValue({ post_id: 1, jobId: 'pending-job', status: 'PENDING_MODERATION' });
    const onSaved = vi.fn();
    const { result } = renderHook(() => usePostComposer({ onSaved }));
    act(() => {
      result.current.form.setValue('title', 'Sườn chay');
      result.current.form.setValue('content', 'Làm từ nấm và đậu nành.');
    });
    await act(async () => { await result.current.submit(); });
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ jobId: 'pending-job' }));
  });
});
