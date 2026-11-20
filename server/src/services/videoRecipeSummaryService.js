// D:/SWP391/SWP391/server/src/services/videoRecipeSummaryService.js
// Nghiệp vụ tạo, theo dõi, thử lại job tóm tắt công thức từ video YouTube và lấy công thức kết quả.
import { videoRecipeSummaryJobRepository as jobs } from '../repositories/videoRecipeSummaryJobRepository.js';
import { videoRecipeSummaryRepository as summaries } from '../repositories/videoRecipeSummaryRepository.js';
import { VIDEO_RECIPE_PIPELINE_VERSION } from '../constants/videoRecipeSummary.js';
import { normalizeYoutubeVideoUrl } from '../utils/youtubeVideoUrl.js';
import { videoRecipeSummaryError } from '../utils/videoRecipeSummaryError.js';

// Lỗi 404 chung cho cả job và công thức để không tiết lộ tài nguyên của người khác.
const notFound = () => videoRecipeSummaryError({ status: 404, code: 'VIDEO_RECIPE_NOT_FOUND', message: 'Không tìm thấy tác vụ hoặc công thức.' });
// Mỗi tài khoản chỉ được có một job đang xử lý để giới hạn chi phí AI.
const busyAccount = () => videoRecipeSummaryError({ status: 409, code: 'VIDEO_JOB_ALREADY_ACTIVE', message: 'Bạn đang có một video chờ xử lý. Vui lòng đợi tác vụ đó hoàn tất.' });

// Chuyển job sang dạng trả về cho client (ẩn các trường nội bộ như lease, transcript).
export function videoRecipeJobView(job) {
  return { jobId: job.id, videoId: job.videoId, videoUrl: job.videoUrl, status: job.status, stage: job.stage,
    summaryId: job.summary?.id || null, errorCode: job.errorCode, errorMessage: job.errorMessage,
    createdAt: job.createdAt, updatedAt: job.updatedAt, completedAt: job.completedAt };
}

// Trả 200 nếu job đã xong, 202 nếu đang xử lý; job thất bại phải dùng chức năng thử lại.
function acceptedJob(job) {
  if (job.status === 'FAILED') throw videoRecipeSummaryError({ status: 409, code: 'VIDEO_JOB_FAILED', message: 'Video này xử lý chưa thành công. Vui lòng dùng chức năng thử lại.' });
  return { status: job.status === 'COMPLETED' ? 200 : 202, data: videoRecipeJobView(job) };
}

// Xử lý xung đột khóa duy nhất: nếu job trùng video đã tồn tại thì trả job đó, ngược lại là tài khoản đang bận.
async function resolveCollision(source) {
  const existing = await jobs.findSource(source);
  if (existing) return acceptedJob(existing);
  throw busyAccount();
}

export const videoRecipeSummaryService = {
  // Tạo job tóm tắt; cùng video + người dùng + phiên bản pipeline thì dùng lại job cũ thay vì xử lý lại.
  async create({ userId, videoUrl }) {
    const source = { ...normalizeYoutubeVideoUrl(videoUrl), userId, pipelineVersion: VIDEO_RECIPE_PIPELINE_VERSION };
    const existing = await jobs.findSource(source);
    if (existing) return acceptedJob(existing);
    try { return acceptedJob(await jobs.create({ ...source, activeUserId: userId })); }
    catch (error) {
      // P2002 = vi phạm unique: hoặc request đồng thời tạo trùng job, hoặc tài khoản đã có job đang chạy.
      if (error.code !== 'P2002') throw error;
      return resolveCollision(source);
    }
  },
  // Lấy trạng thái một job của người dùng.
  async getJob(query) {
    const job = await jobs.findOwned(query);
    if (!job) throw notFound();
    return videoRecipeJobView(job);
  },
  // Liệt kê các job của người dùng có phân trang.
  async list(query) {
    const [records, total] = await Promise.all([jobs.listOwned(query), jobs.countOwned(query)]);
    return { data: records.map(videoRecipeJobView), meta: { page: query.page, limit: query.limit, total } };
  },
  // Thử lại job thất bại; job chưa thất bại thì chỉ trả trạng thái hiện tại.
  async retry(query) {
    const job = await jobs.findOwnedInternal(query);
    if (!job) throw notFound();
    if (job.status !== 'FAILED') return acceptedJob(job);
    try { await jobs.requeue({ job }); }
    catch (error) {
      // Không requeue được vì tài khoản đang có job khác hoạt động.
      if (error.code !== 'P2002') throw error;
      throw busyAccount();
    }
    return { status: 202, data: await this.getJob(query) };
  },
  // Lấy công thức đã tóm tắt của người dùng.
  async getSummary(query) {
    const summary = await summaries.findOwned(query);
    if (!summary) throw notFound();
    const { id, ...data } = summary;
    return { summaryId: id, ...data };
  },
};
