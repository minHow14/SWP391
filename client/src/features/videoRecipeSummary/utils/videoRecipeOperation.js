// client/src/features/videoRecipeSummary/utils/videoRecipeOperation.js
import { getSession } from '../../../utils/session.js';
import { videoRecipeSummaryApi } from '../../../services/videoRecipeSummaryApi.js';
import { clearSavedVideoJob, observeVideoRecipeJob, saveVideoJob } from './videoRecipeJobs.js';

export class VideoRecipeOperation {
  constructor(context) {
    this.context = context;
    this.controller = new AbortController();
    this.replyId = context.nextId.current++;
    this.job = null;
  }

  active() {
    return !this.controller.signal.aborted && this.context.operation.current === this
      && getSession()?.user?.user_id === this.context.userId;
  }

  stop() { this.controller.abort(); }

  open(request) {
    this.job = request.job || null;
    const bubble = { id: this.replyId, role: 'assistant', kind: 'videoRecipe', ownerId: this.context.userId,
      videoUrl: request.source?.videoUrl || this.job?.videoUrl, job: this.job, pending: true, preparing: true };
    const jobId = this.job?.jobId;
    this.context.setMessages((previous) => {
      const existing = jobId && previous.find((item) => item.kind === 'videoRecipe' && item.ownerId === bubble.ownerId && item.job?.jobId === jobId);
      return existing ? previous.map((item) => item.id === existing.id ? bubble : item) : [...previous, bubble];
    });
  }

  patch(fields) {
    if (!this.active()) return;
    this.context.setMessages((previous) => previous.map((item) => item.id === this.replyId ? { ...item, ...fields } : item));
  }

  async loadJob(request) {
    const api = videoRecipeSummaryApi;
    const signal = this.controller.signal;
    if (request.job) return request.retry && request.job.status === 'FAILED'
      ? api.retry(request.job.jobId, signal) : api.getJob(request.job.jobId, signal);
    try { return await api.create(request.source.videoUrl, signal); }
    catch (error) {
      if (!this.active() || error.status === 401 || error.status === 403) throw error;
      const records = await api.list({ videoId: request.source.videoId, limit: 1 }, signal).catch(() => []);
      if (!records.length) throw error;
      return records[0];
    }
  }

  async watch() {
    await observeVideoRecipeJob({ api: videoRecipeSummaryApi, job: this.job, signal: this.controller.signal,
      onJob: (job) => { this.job = job; this.patch({ job, preparing: false }); },
      onResult: (summary) => this.patch({ summary, pending: false, preparing: false }),
    });
    if (!this.active()) return;
    clearSavedVideoJob(this.context.userId);
    this.patch({ pending: false, preparing: false });
  }

  async run(request) {
    this.context.setBusy(true);
    this.open(request);
    try {
      this.job = await this.loadJob(request);
      if (!this.active()) return;
      saveVideoJob({ userId: this.context.userId, jobId: this.job.jobId });
      await this.watch();
    } catch (error) {
      this.patch({ pending: false, preparing: false, observationError: error.message, requestId: error.requestId,
        needsLogin: error.status === 401, job: this.job });
    } finally {
      if (this.active()) { this.context.setBusy(false); this.context.operation.current = null; }
    }
  }
}
