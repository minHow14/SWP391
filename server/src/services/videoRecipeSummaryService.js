// server/src/services/videoRecipeSummaryService.js
import { videoRecipeSummaryJobRepository as jobs } from '../repositories/videoRecipeSummaryJobRepository.js';
import { videoRecipeSummaryRepository as summaries } from '../repositories/videoRecipeSummaryRepository.js';
import { VIDEO_RECIPE_PIPELINE_VERSION } from '../constants/videoRecipeSummary.js';
import { normalizeYoutubeVideoUrl } from '../utils/youtubeVideoUrl.js';
import { videoRecipeSummaryError } from '../utils/videoRecipeSummaryError.js';

const notFound = () => videoRecipeSummaryError({ status: 404, code: 'VIDEO_RECIPE_NOT_FOUND', message: 'Không tìm thấy tác vụ hoặc công thức.' });
const busyAccount = () => videoRecipeSummaryError({ status: 409, code: 'VIDEO_JOB_ALREADY_ACTIVE', message: 'Bạn đang có một video chờ xử lý. Vui lòng đợi tác vụ đó hoàn tất.' });

export function videoRecipeJobView(job) {
  return { jobId: job.id, videoId: job.videoId, videoUrl: job.videoUrl, status: job.status, stage: job.stage,
    summaryId: job.summary?.id || null, errorCode: job.errorCode, errorMessage: job.errorMessage,
    createdAt: job.createdAt, updatedAt: job.updatedAt, completedAt: job.completedAt };
}

function acceptedJob(job) {
  if (job.status === 'FAILED') throw videoRecipeSummaryError({ status: 409, code: 'VIDEO_JOB_FAILED', message: 'Video này xử lý chưa thành công. Vui lòng dùng chức năng thử lại.' });
  return { status: job.status === 'COMPLETED' ? 200 : 202, data: videoRecipeJobView(job) };
}

async function resolveCollision(source) {
  const existing = await jobs.findSource(source);
  if (existing) return acceptedJob(existing);
  throw busyAccount();
}

export const videoRecipeSummaryService = {
  async create({ userId, videoUrl }) {
    const source = { ...normalizeYoutubeVideoUrl(videoUrl), userId, pipelineVersion: VIDEO_RECIPE_PIPELINE_VERSION };
    const existing = await jobs.findSource(source);
    if (existing) return acceptedJob(existing);
    try { return acceptedJob(await jobs.create({ ...source, activeUserId: userId })); }
    catch (error) {
      if (error.code !== 'P2002') throw error;
      return resolveCollision(source);
    }
  },
  async getJob(query) {
    const job = await jobs.findOwned(query);
    if (!job) throw notFound();
    return videoRecipeJobView(job);
  },
  async list(query) {
    const [records, total] = await Promise.all([jobs.listOwned(query), jobs.countOwned(query)]);
    return { data: records.map(videoRecipeJobView), meta: { page: query.page, limit: query.limit, total } };
  },
  async retry(query) {
    const job = await jobs.findOwnedInternal(query);
    if (!job) throw notFound();
    if (job.status !== 'FAILED') return acceptedJob(job);
    try { await jobs.requeue({ job }); }
    catch (error) {
      if (error.code !== 'P2002') throw error;
      throw busyAccount();
    }
    return { status: 202, data: await this.getJob(query) };
  },
  async getSummary(query) {
    const summary = await summaries.findOwned(query);
    if (!summary) throw notFound();
    const { id, ...data } = summary;
    return { summaryId: id, ...data };
  },
};
