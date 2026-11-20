// D:/SWP391/SWP391/client/src/features/videoRecipeSummary/utils/videoRecipeJobs.js
// Tiện ích job tóm tắt công thức video: chờ, theo dõi trạng thái và lưu job đang chạy trong sessionStorage.
const STORAGE_KEY = 'chayxanh-video-recipe-job';
// Hỏi trạng thái job mỗi 5 giây vì xử lý video mất nhiều thời gian.
const POLL_INTERVAL_MS = 5000;
const JOB_STATES = new Set(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);

// Chờ một khoảng thời gian, có thể hủy bằng AbortSignal.
export function waitForVideoJob(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); reject(signal.reason || new DOMException('Đã dừng theo dõi.', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', cancel); resolve(); }, milliseconds);
    if (signal?.aborted) return cancel();
    signal?.addEventListener('abort', cancel, { once: true });
  });
}

// Hỏi trạng thái job tới khi hoàn tất hoặc thất bại; khi hoàn tất thì tải bản tóm tắt và kiểm tra có đủ các bước nấu.
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

// Đọc job đã lưu của đúng người dùng; trả null nếu không có hoặc storage bị chặn.
export function savedVideoJob(userId) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return saved?.userId === userId && typeof saved.jobId === 'string' ? saved : null;
  } catch { return null; }
}

// Lưu job đang chạy để tiếp tục theo dõi sau khi tải lại trang.
export function saveVideoJob(record) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch { /* Vẫn khôi phục được sau khi tải lại nhờ truy vấn lịch sử từ BE. */ }
}

// Xóa job đã lưu nếu thuộc về người dùng này.
export function clearSavedVideoJob(userId) {
  if (!savedVideoJob(userId)) return;
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Storage có thể bị trình duyệt chặn. */ }
}
