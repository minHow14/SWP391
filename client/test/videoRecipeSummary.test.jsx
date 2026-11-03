// D:/SWP391/SWP391/client/test/videoRecipeSummary.test.jsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { useRef, useState } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import apiClient from '../src/services/apiClient.js';
import { getSession, setSession } from '../src/utils/session.js';
import { detectYoutubeMessage } from '../src/features/videoRecipeSummary/utils/youtubeMessage.js';
import { observeVideoRecipeJob } from '../src/features/videoRecipeSummary/utils/videoRecipeJobs.js';
import { useVideoRecipeSummary } from '../src/features/videoRecipeSummary/hooks/useVideoRecipeSummary.js';
import { videoRecipeSummaryApi } from '../src/services/videoRecipeSummaryApi.js';

const URL = 'https://www.youtube.com/watch?v=AbCdEfGhI12';
const originalAdapter = apiClient.defaults.adapter;
beforeEach(() => { setSession(null); });
afterEach(() => { cleanup(); apiClient.defaults.adapter = originalAdapter; setSession(null); sessionStorage.clear(); });

describe('YouTube detection on chat send', () => {
  it.each([`Tạo công thức từ ${URL}`, 'youtube.com/watch?v=AbCdEfGhI12', 'https://youtu.be/AbCdEfGhI12.'])('recognizes a video inside text', (text) => {
    expect(detectYoutubeMessage(text)).toEqual({ videoId: 'AbCdEfGhI12', videoUrl: URL });
  });
  it('keeps ordinary chat and deduplicates repeated links to the same video', () => {
    expect(detectYoutubeMessage('Gợi ý món từ nấm')).toBeNull();
    expect(detectYoutubeMessage(`${URL} và https://youtu.be/AbCdEfGhI12`).videoUrl).toBe(URL);
  });
  it.each([`${URL} https://youtu.be/AnotherId12`, 'https://youtube.com.evil.invalid/watch?v=AbCdEfGhI12',
    'https://name:password@youtube.com/watch?v=AbCdEfGhI12', `${URL}&list=playlist`])('rejects unsafe or ambiguous video input', (text) => {
    expect(() => detectYoutubeMessage(text)).toThrow();
  });
});

describe('job observation', () => {
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
  it('retains a completed job context when retrieving its result fails', async () => {
    const onJob = vi.fn();
    await expect(observeVideoRecipeJob({ api: { getSummary: vi.fn().mockRejectedValue(new Error('Mất kết nối')) },
      job: { jobId: 'job', status: 'COMPLETED', summaryId: 'summary' }, signal: new AbortController().signal, onJob,
      onResult: vi.fn() })).rejects.toThrow('Mất kết nối');
    expect(onJob).toHaveBeenCalledWith(expect.objectContaining({ jobId: 'job', status: 'COMPLETED' }));
  });
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

describe('shared Axios authentication errors', () => {
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

describe('restoring video progress', () => {
  it('replaces a stopped pending bubble when the server completed while chat was closed', async () => {
    setSession({ token: 'current', user: { user_id: 7 } });
    const completed = { jobId: 'job', status: 'COMPLETED', summaryId: 'summary', videoUrl: URL };
    vi.spyOn(videoRecipeSummaryApi, 'list').mockImplementation(async ({ status }) => status ? [] : [completed]);
    vi.spyOn(videoRecipeSummaryApi, 'getSummary').mockResolvedValue({ recipe: { ingredients: [], steps: [{ instruction: 'Nấu chín.' }] } });
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
