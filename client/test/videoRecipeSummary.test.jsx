// D:/SWP391/SWP391/client/test/videoRecipeSummary.test.jsx
// Kiểm thử tính năng tạo công thức từ video YouTube: trạng thái job, nhận diện liên kết, theo dõi job, lỗi xác thực và khôi phục tiến trình.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { useRef, useState } from 'react';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import apiClient from '../src/services/apiClient.js';
import { getSession, setSession } from '../src/utils/session.js';
import { detectYoutubeMessage } from '../src/features/videoRecipeSummary/utils/youtubeMessage.js';
import { observeVideoRecipeJob } from '../src/features/videoRecipeSummary/utils/videoRecipeJobs.js';
import { useVideoRecipeSummary } from '../src/features/videoRecipeSummary/hooks/useVideoRecipeSummary.js';
import { videoRecipeSummaryApi } from '../src/services/videoRecipeSummaryApi.js';
import VideoRecipeMessage from '../src/features/videoRecipeSummary/components/VideoRecipeMessage.jsx';

// Liên kết YouTube chuẩn dùng làm kết quả mong đợi sau khi chuẩn hóa.
const URL = 'https://www.youtube.com/watch?v=AbCdEfGhI12';
// Lưu adapter gốc của axios; mỗi test bắt đầu và kết thúc với phiên trống.
const originalAdapter = apiClient.defaults.adapter;
beforeEach(() => { setSession(null); });
afterEach(() => { cleanup(); apiClient.defaults.adapter = originalAdapter; setSession(null); sessionStorage.clear(); });

// Nhóm test hiển thị trạng thái lấy phụ đề.
describe('caption recipe status', () => {
  // Đang xử lý thì hiển thị bước lấy phụ đề; thiếu phụ đề thì hiển thị đúng thông báo server và cho phép thử lại.
  it('shows caption retrieval while processing and the server message when captions are missing', () => {
    const { rerender } = render(<VideoRecipeMessage message={{ pending: true,
      job: { status: 'PROCESSING', stage: 'FETCHING_CAPTIONS' } }} busy onRetry={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain('Đang lấy phụ đề tiếng Việt…');
    rerender(<VideoRecipeMessage message={{ job: { status: 'FAILED', errorCode: 'VIDEO_CAPTIONS_UNAVAILABLE',
      errorMessage: 'Video chưa có phụ đề phù hợp' } }} busy={false} onRetry={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toBe('Video chưa có phụ đề phù hợp');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: 'Thử tạo lại' }).disabled).toBe(false);
  });
});

// Nhóm test nhận diện liên kết YouTube khi gửi tin nhắn chat.
describe('YouTube detection on chat send', () => {
  // Nhận diện được video nằm trong câu chữ, kể cả liên kết rút gọn, thiếu giao thức hoặc có dấu chấm cuối câu.
  it.each([`Tạo công thức từ ${URL}`, 'youtube.com/watch?v=AbCdEfGhI12', 'https://youtu.be/AbCdEfGhI12.'])('recognizes a video inside text', (text) => {
    expect(detectYoutubeMessage(text)).toEqual({ videoId: 'AbCdEfGhI12', videoUrl: URL });
  });
  // Tin nhắn thường không bị coi là video; nhiều liên kết cùng một video được gộp lại.
  it('keeps ordinary chat and deduplicates repeated links to the same video', () => {
    expect(detectYoutubeMessage('Gợi ý món từ nấm')).toBeNull();
    expect(detectYoutubeMessage(`${URL} và https://youtu.be/AbCdEfGhI12`).videoUrl).toBe(URL);
  });
  // Từ chối đầu vào không an toàn hoặc mơ hồ: nhiều video, tên miền giả mạo, URL chứa thông tin đăng nhập, danh sách phát.
  it.each([`${URL} https://youtu.be/AnotherId12`, 'https://youtube.com.evil.invalid/watch?v=AbCdEfGhI12',
    'https://name:password@youtube.com/watch?v=AbCdEfGhI12', `${URL}&list=playlist`])('rejects unsafe or ambiguous video input', (text) => {
    expect(() => detectYoutubeMessage(text)).toThrow();
  });
});

// Nhóm test theo dõi job tạo công thức.
describe('job observation', () => {
  // Hiển thị đúng các giai đoạn thật và chỉ tải công thức đã lưu sau khi job hoàn tất.
  it('shows actual stages and fetches the saved recipe only after completion', async () => {
    const api = { getJob: vi.fn().mockResolvedValue({ jobId: 'job', status: 'COMPLETED', summaryId: 'summary' }),
      getSummary: vi.fn().mockResolvedValue({ recipe: { ingredients: [], steps: [{ instruction: 'Xào nấm.' }] } }) };
    const onJob = vi.fn();
    const onResult = vi.fn();
    await observeVideoRecipeJob({ api, job: { jobId: 'job', status: 'PROCESSING', stage: 'TRANSCRIBING' },
      signal: new AbortController().signal, onJob, onResult, pollMs: 0 });
    expect(onJob.mock.calls.map(([job]) => job.status)).toEqual(['PROCESSING', 'COMPLETED']);
    expect(api.getSummary).toHaveBeenCalledWith('summary', expect.any(AbortSignal));
    expect(onResult).toHaveBeenCalledOnce();
  });
  // Tải kết quả lỗi thì vẫn giữ ngữ cảnh job đã hoàn tất để có thể thử lại.
  it('retains a completed job context when retrieving its result fails', async () => {
    const onJob = vi.fn();
    await expect(observeVideoRecipeJob({ api: { getSummary: vi.fn().mockRejectedValue(new Error('Mất kết nối')) },
      job: { jobId: 'job', status: 'COMPLETED', summaryId: 'summary' }, signal: new AbortController().signal, onJob,
      onResult: vi.fn() })).rejects.toThrow('Mất kết nối');
    expect(onJob).toHaveBeenCalledWith(expect.objectContaining({ jobId: 'job', status: 'COMPLETED' }));
  });
  // Đã hủy thì ngừng polling, và công thức rỗng không bao giờ được coi là thành công.
  it('stops polling after abort and never treats an empty recipe as success', async () => {
    const controller = new AbortController();
    controller.abort();
    const api = { getJob: vi.fn(), getSummary: vi.fn().mockResolvedValue({ recipe: { steps: [] } }) };
    await expect(observeVideoRecipeJob({ api, job: { jobId: 'job', status: 'PENDING' }, signal: controller.signal })).rejects.toThrow();
    expect(api.getJob).not.toHaveBeenCalled();
    await expect(observeVideoRecipeJob({ api, job: { jobId: 'job', status: 'COMPLETED', summaryId: 'summary' },
      signal: new AbortController().signal })).rejects.toThrow();
  });
});

// Nhóm test lỗi xác thực dùng chung của Axios.
describe('shared Axios authentication errors', () => {
  // Request cũ nhận 401 không được xóa phiên đăng nhập mới hơn, và lỗi phải giữ mã lỗi cùng requestId từ server.
  it('does not clear a newer login when an old request gets 401', async () => {
    setSession({ token: 'older', user: { user_id: 7 } });
    apiClient.defaults.adapter = async (config) => {
      setSession({ token: 'newer', user: { user_id: 8 } });
      throw new AxiosError('Expired', 'ERR_BAD_REQUEST', config, null,
        { status: 401, data: { message: 'Hết phiên', errorCode: 'UNAUTHORIZED', meta: { requestId: 'request-id' } }, config });
    };
    await expect(apiClient.get('/v1/video-recipe-summary-jobs')).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED', requestId: 'request-id' });
    expect(getSession().token).toBe('newer');
  });
});

// Nhóm test khôi phục tiến trình video khi mở lại chat.
describe('restoring video progress', () => {
  // Bong bóng đang chờ phải được thay bằng kết quả khi server đã hoàn tất job trong lúc chat đóng.
  it('replaces a stopped pending bubble when the server completed while chat was closed', async () => {
    setSession({ token: 'current', user: { user_id: 7 } });
    const completed = { jobId: 'job', status: 'COMPLETED', summaryId: 'summary', videoUrl: URL };
    vi.spyOn(videoRecipeSummaryApi, 'list').mockImplementation(async ({ status }) => status ? [] : [completed]);
    vi.spyOn(videoRecipeSummaryApi, 'getSummary').mockResolvedValue({ recipe: { ingredients: [], steps: [{ instruction: 'Nấu chín.' }] } });
    // Hook bọc useVideoRecipeSummary với state tin nhắn ban đầu có một bong bóng đang xử lý.
    function useHarness() {
      const [messages, setMessages] = useState([{ id: 1, kind: 'videoRecipe', ownerId: 7, pending: true, job: { jobId: 'job', status: 'PROCESSING' } }]);
      const nextId = useRef(2);
      useVideoRecipeSummary({ userId: 7, enabled: true, setMessages, nextId });
      return messages;
    }
    const { result } = renderHook(() => useHarness());
    await waitFor(() => expect(result.current[0]).toMatchObject({ id: 1, pending: false, job: { status: 'COMPLETED' } }));
    expect(result.current).toHaveLength(1);
  });

  // Công thức đến muộn sau khi đổi chủ tài khoản (đăng xuất) phải bị bỏ qua để không lộ dữ liệu riêng tư.
  it('ignores a late saved recipe after the owner changes', async () => {
    setSession({ token: 'current', user: { user_id: 7 } });
    let finish;
    vi.spyOn(videoRecipeSummaryApi, 'list').mockImplementation(async ({ status }) => status ? [] : [{ jobId: 'job', status: 'COMPLETED', summaryId: 'summary' }]);
    vi.spyOn(videoRecipeSummaryApi, 'getSummary').mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    function useHarness(userId) {
      const [messages, setMessages] = useState([]);
      const nextId = useRef(1);
      useVideoRecipeSummary({ userId, enabled: true, setMessages, nextId });
      return messages;
    }
    const { result, rerender } = renderHook(({ userId }) => useHarness(userId), { initialProps: { userId: 7 } });
    await waitFor(() => expect(finish).toBeTypeOf('function'));
    setSession(null);
    rerender({ userId: null });
    await act(async () => finish({ recipe: { ingredients: [], steps: [{ instruction: 'Riêng tư' }] } }));
    expect(result.current).toEqual([]);
  });

  // Khôi phục các job gần đây đã hoàn tất/thất bại mà không tạo mới hay tự thử lại việc chuyển giọng nói thành văn bản.
  it('restores recent completed and failed jobs without creating or retrying transcription', async () => {
    setSession({ token: 'current', user: { user_id: 7 } });
    const completed = { jobId: 'completed', status: 'COMPLETED', summaryId: 'summary', videoUrl: URL };
    const failed = { jobId: 'failed', status: 'FAILED', errorMessage: 'Không nhận dạng được âm thanh', videoUrl: URL };
    vi.spyOn(videoRecipeSummaryApi, 'list').mockImplementation(async ({ status }) => status ? [] : [completed, failed]);
    const create = vi.spyOn(videoRecipeSummaryApi, 'create');
    const retry = vi.spyOn(videoRecipeSummaryApi, 'retry');
    vi.spyOn(videoRecipeSummaryApi, 'getSummary').mockResolvedValue({ recipe: { title: 'Món từ video', ingredients: [], steps: [{ instruction: 'Xào nấm.' }] } });
    function useHarness(enabled) {
      const [messages, setMessages] = useState([]);
      const nextId = useRef(1);
      useVideoRecipeSummary({ userId: 7, enabled, setMessages, nextId });
      return messages;
    }
    const { result, rerender } = renderHook(({ enabled }) => useHarness(enabled), { initialProps: { enabled: true } });
    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current.find((message) => message.job.jobId === 'completed').summary.recipe.title).toBe('Món từ video');
    expect(result.current.find((message) => message.job.jobId === 'failed')).toMatchObject({ pending: false, job: { errorMessage: 'Không nhận dạng được âm thanh' } });
    rerender({ enabled: false });
    rerender({ enabled: true });
    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(create).not.toHaveBeenCalled();
    expect(retry).not.toHaveBeenCalled();
  });

  // Không tải được danh sách job thì hiển thị lỗi có thể thử lại, thay vì để bong bóng cũ quay mãi.
  it('shows a retryable error instead of leaving an old bubble spinning', async () => {
    setSession({ token: 'current', user: { user_id: 7 } });
    vi.spyOn(videoRecipeSummaryApi, 'list').mockRejectedValue(new Error('Mất kết nối'));
    function useHarness() {
      const [messages, setMessages] = useState([{ id: 1, kind: 'videoRecipe', ownerId: 7,
        pending: true, job: { jobId: 'job', status: 'PROCESSING' } }]);
      const nextId = useRef(2);
      useVideoRecipeSummary({ userId: 7, enabled: true, setMessages, nextId });
      return messages;
    }
    const { result } = renderHook(() => useHarness());
    await waitFor(() => expect(result.current[0]).toMatchObject({ pending: false,
      observationError: 'Mất kết nối', job: { jobId: 'job' } }));
  });
});
