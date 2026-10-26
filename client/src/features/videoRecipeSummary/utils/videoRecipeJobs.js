// D:/SWP391/SWP391/client/src/features/videoRecipeSummary/utils/videoRecipeJobs.js
const STORAGE_KEY = 'chayxanh-video-recipe-job';
const POLL_INTERVAL_MS = 5000;
const JOB_STATES = new Set(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);

export function waitForVideoJob(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); reject(signal.reason || new DOMException('Đã dừng theo dõi.', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', cancel); resolve(); }, milliseconds);
    if (signal?.aborted) return cancel();
    signal?.addEventListener('abort', cancel, { once: true });
  });
}

export async function observeVideoRecipeJob({ api, job: initial, signal, onJob = () => {}, onResult = () => {}, pollMs = POLL_INTERVAL_MS }) {
  let job = initial;
  while (true) {
    signal?.throwIfAborted();
    if (!JOB_STATES.has(job?.status)) throw new Error('Trạng thái xử lý video không hợp lệ.');
    onJob(job);
    if (job.status === 'FAILED') return;
    if (job.status === 'COMPLETED') {
      if (!job.summaryId) throw new Error('Tác vụ hoàn tất nhưng chưa có công thức.');
      const result = await api.getSummary(job.summaryId, signal);
      signal?.throwIfAborted();
      if (!result?.recipe?.steps?.length) throw new Error('Chưa nhận được hướng dẫn nấu ăn đầy đủ.');
      onResult(result);
      return;
    }
    await waitForVideoJob(pollMs, signal);
    job = await api.getJob(job.jobId, signal);
  }
}

export function savedVideoJob(userId) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return saved?.userId === userId && typeof saved.jobId === 'string' ? saved : null;
  } catch { return null; }
}

export function saveVideoJob(record) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch { /* Discovery through BE still supports reload. */ }
}

export function clearSavedVideoJob(userId) {
  if (!savedVideoJob(userId)) return;
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be blocked. */ }
}
