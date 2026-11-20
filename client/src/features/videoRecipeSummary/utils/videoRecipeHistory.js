// D:/SWP391/SWP391/client/src/features/videoRecipeSummary/utils/videoRecipeHistory.js
// Khôi phục lịch sử công thức video của người dùng từ server khi mở lại chatbot hoặc tải lại trang.
import { getSession } from '../../../utils/session.js';
import { videoRecipeSummaryApi } from '../../../services/videoRecipeSummaryApi.js';
import { clearSavedVideoJob, savedVideoJob } from './videoRecipeJobs.js';

// Thao tác còn hợp lệ khi chưa bị hủy và người dùng đăng nhập vẫn là chủ ngữ cảnh.
function isActive(context, signal) {
  return !signal.aborted && getSession()?.user?.user_id === context.userId;
}

// Dựng tin nhắn từ một job đã kết thúc (tải bản tóm tắt nếu hoàn tất) và chèn/cập nhật vào danh sách,
// không ghi đè tin nhắn đã có kết quả hoặc đang được theo dõi trực tiếp.
async function restoreResult(context, job, signal) {
  const bubble = { id: context.nextId.current++, role: 'assistant', kind: 'videoRecipe', ownerId: context.userId,
    videoUrl: job.videoUrl, job, pending: false, preparing: false };
  if (job.status === 'COMPLETED') {
    try {
      if (!job.summaryId) throw new Error('Tác vụ hoàn tất nhưng chưa có công thức.');
      const summary = await videoRecipeSummaryApi.getSummary(job.summaryId, signal);
      if (!summary?.recipe?.steps?.length) throw new Error('Chưa nhận được hướng dẫn nấu ăn đầy đủ.');
      bubble.summary = summary;
    } catch (error) { bubble.observationError = error.message; bubble.requestId = error.requestId; }
  }
  if (!isActive(context, signal)) return;
  context.setMessages((previous) => {
    const existing = previous.find((item) => item.kind === 'videoRecipe' && item.ownerId === context.userId && item.job?.jobId === job.jobId);
    const observing = context.operation.current?.job?.jobId === job.jobId;
    if (existing?.summary || (existing?.pending && observing)) return previous;
    return existing ? previous.map((item) => item === existing ? { ...bubble, id: existing.id } : item) : [...previous, bubble];
  });
}

// Tải job đã lưu trong phiên và các job gần đây, hiển thị các job đã kết thúc theo thứ tự thời gian;
// trả về job còn đang chạy (nếu có) để tiếp tục theo dõi.
export async function discoverVideoHistory(context, signal) {
  const stored = savedVideoJob(context.userId);
  let saved = null;
  if (stored) {
    try { saved = await videoRecipeSummaryApi.getJob(stored.jobId, signal); }
    catch (error) { if (error.status !== 404) throw error; clearSavedVideoJob(context.userId); }
  }
  const [recent, pending, processing] = await Promise.all([
    videoRecipeSummaryApi.list({ limit: 10 }, signal),
    ...['PENDING', 'PROCESSING'].map((status) => videoRecipeSummaryApi.list({ status, limit: 1 }, signal)),
  ]);
  if (!isActive(context, signal)) return null;
  const jobs = [...new Map([...recent, ...pending, ...processing, ...(saved ? [saved] : [])].map((job) => [job.jobId, job])).values()];
  const terminal = jobs.filter((job) => ['COMPLETED', 'FAILED'].includes(job.status)).reverse();
  for (const job of terminal) {
    if (!isActive(context, signal)) return null;
    await restoreResult(context, job, signal);
  }
  return jobs.find((job) => ['PENDING', 'PROCESSING'].includes(job.status)) || null;
}
