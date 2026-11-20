// server/src/repositories/videoRecipeSummaryJobRepository.js
// Repository hàng đợi job tóm tắt công thức từ video: nhận job theo cơ chế lease, gia hạn, hoàn tất, thất bại và khôi phục job treo.
import { randomUUID } from 'node:crypto';
import prisma from '../config/prisma.js';
import { lostVideoRecipeLease } from '../utils/videoRecipeSummaryError.js';
import { videoRecipeSummaryRepository } from './videoRecipeSummaryRepository.js';

// Các cột an toàn để trả cho client.
const PUBLIC_SELECT = {
  id: true,
  videoId: true,
  videoUrl: true,
  status: true,
  stage: true,
  errorCode: true,
  errorMessage: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  recipe: true,
};
// Các cột nội bộ cho worker (lease, transcript, số lần thử...), không bao giờ trả trực tiếp cho client.
const INTERNAL_SELECT = {
  ...PUBLIC_SELECT,
  userId: true,
  activeUserId: true,
  pipelineVersion: true,
  attempt: true,
  availableAt: true,
  leaseToken: true,
  leaseExpiresAt: true,
  metadata: true,
  transcript: true,
};
// Điều kiện lọc job thuộc người dùng, tùy chọn lọc theo trạng thái/video.
const ownedWhere = ({ userId, status, videoId }) => ({
  userId,
  ...(status && { status }),
  ...(videoId && { videoId }),
});
// Chỉ worker còn giữ lease hợp lệ (đúng token, chưa hết hạn, đang PROCESSING) mới được cập nhật job.
const leaseWhere = ({ id, leaseToken }) => ({
  id,
  leaseToken,
  status: 'PROCESSING',
  leaseExpiresAt: { gt: new Date() },
});
// Giá trị dùng để giải phóng lease khi job rời trạng thái PROCESSING.
const releasedLease = { leaseToken: null, leaseExpiresAt: null };

// Thêm trường ảo `summary` vì công thức nằm ngay trên job, giúp tầng trên dùng chung cấu trúc như có bảng summary riêng.
function attachSummaryVirtual(job) {
  if (!job) return null;
  return {
    ...job,
    summary: job.recipe ? { id: job.id } : null,
  };
}

// Cập nhật job khi còn giữ lease; không cập nhật được đúng 1 dòng nghĩa là đã mất lease -> ném lỗi để worker dừng.
async function updateLeased({ id, leaseToken, data }, db = prisma) {
  const result = await db.videoRecipeSummaryJob.updateMany({ where: leaseWhere({ id, leaseToken }), data });
  if (result.count !== 1) throw lostVideoRecipeLease();
}

export const videoRecipeSummaryJobRepository = {
  // Chạy thao tác trong transaction.
  runTransaction(work, db = prisma) {
    return db.$transaction(work);
  },
  // Tạo job mới.
  async create(data, db = prisma) {
    const job = await db.videoRecipeSummaryJob.create({ data, select: INTERNAL_SELECT });
    return attachSummaryVirtual(job);
  },
  // Tìm job theo khóa duy nhất (người dùng + video + phiên bản pipeline) để tái sử dụng kết quả cũ.
  async findSource({ userId, videoId, pipelineVersion }, db = prisma) {
    const job = await db.videoRecipeSummaryJob.findUnique({
      where: { userId_videoId_pipelineVersion: { userId, videoId, pipelineVersion } },
      select: INTERNAL_SELECT,
    });
    return attachSummaryVirtual(job);
  },
  // Lấy job của người dùng (cột công khai).
  async findOwned({ id, userId }, db = prisma) {
    const job = await db.videoRecipeSummaryJob.findFirst({ where: { id, userId }, select: PUBLIC_SELECT });
    return attachSummaryVirtual(job);
  },
  // Lấy job của người dùng kèm cột nội bộ (dùng khi thử lại).
  async findOwnedInternal({ id, userId }, db = prisma) {
    const job = await db.videoRecipeSummaryJob.findFirst({ where: { id, userId }, select: INTERNAL_SELECT });
    return attachSummaryVirtual(job);
  },
  // Tìm job đang hoạt động của người dùng (activeUserId chỉ có giá trị khi job chưa kết thúc).
  async findActive({ userId }, db = prisma) {
    const job = await db.videoRecipeSummaryJob.findFirst({ where: { activeUserId: userId }, select: INTERNAL_SELECT });
    return attachSummaryVirtual(job);
  },
  // Liệt kê job của người dùng có phân trang, mới nhất trước.
  async listOwned(query, db = prisma) {
    const jobs = await db.videoRecipeSummaryJob.findMany({
      where: ownedWhere(query),
      select: PUBLIC_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return jobs.map(attachSummaryVirtual);
  },
  // Đếm job của người dùng.
  countOwned(query, db = prisma) {
    return db.videoRecipeSummaryJob.count({ where: ownedWhere(query) });
  },
  // Đưa job FAILED về hàng đợi; reset số lần thử và giữ stage SUMMARIZING nếu đã có transcript để khỏi nhận dạng lại.
  async requeue({ job }, db = prisma) {
    const result = await db.videoRecipeSummaryJob.updateMany({
      where: { id: job.id, userId: job.userId, status: 'FAILED' },
      data: {
        status: 'PENDING',
        activeUserId: job.userId,
        attempt: 0,
        availableAt: new Date(),
        ...releasedLease,
        // Đã có transcript thì bỏ qua bước kiểm tra video/nhận dạng giọng nói.
        stage: job.transcript ? 'SUMMARIZING' : 'VALIDATING_VIDEO',
        errorCode: null,
        errorMessage: null,
        completedAt: null,
      },
    });
    return result.count;
  },
  // Nhận một job PENDING đến hạn; FOR UPDATE SKIP LOCKED để nhiều worker chạy song song không nhận trùng job.
  claim({ leaseMs, maxAttempts }, db = prisma) {
    return db.$transaction(async (tx) => {
      const [candidate] = await tx.$queryRaw`SELECT id FROM video_recipe_summary_jobs
        WHERE status = 'PENDING' AND available_at <= NOW() AND attempt < ${maxAttempts}
        ORDER BY available_at, created_at, id FOR UPDATE SKIP LOCKED LIMIT 1`;
      if (!candidate) return null;
      const updated = await tx.videoRecipeSummaryJob.update({
        where: { id: candidate.id },
        select: INTERNAL_SELECT,
        data: {
          status: 'PROCESSING',
          attempt: { increment: 1 },
          leaseToken: randomUUID(),
          leaseExpiresAt: new Date(Date.now() + leaseMs),
        },
      });
      return attachSummaryVirtual(updated);
    });
  },
  // Cho phép processor cập nhật stage khi còn giữ lease.
  updateLeased,
  // Gia hạn lease để job chạy lâu không bị coi là treo và bị worker khác nhận lại.
  renew({ job, leaseMs }, db = prisma) {
    return updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { leaseExpiresAt: new Date(Date.now() + leaseMs) } }, db);
  },
  // Hoàn tất job và lưu công thức trong cùng transaction; activeUserId = null để người dùng tạo được job mới.
  complete({ job, recipe }, db = prisma) {
    return db.$transaction(async (tx) => {
      await updateLeased({
        id: job.id,
        leaseToken: job.leaseToken,
        data: {
          status: 'COMPLETED',
          stage: 'SAVING_RESULT',
          activeUserId: null,
          ...releasedLease,
          completedAt: new Date(),
          errorCode: null,
          errorMessage: null,
          recipe,
        },
      }, tx);
      return videoRecipeSummaryRepository.create({ job, recipe }, tx);
    });
  },
  // Ghi nhận thất bại: còn lượt và lỗi cho phép thử lại thì đưa về PENDING với thời gian chờ, ngược lại FAILED.
  fail({ job, error, config }, db = prisma) {
    const retry = error.retryable && job.attempt < config.maxAttempts;
    return updateLeased({
      id: job.id,
      leaseToken: job.leaseToken,
      data: {
        status: retry ? 'PENDING' : 'FAILED',
        activeUserId: retry ? job.userId : null,
        ...releasedLease,
        completedAt: retry ? null : new Date(),
        // Tôn trọng retryAfterMs từ nhà cung cấp AI (vd. bị rate limit) nếu dài hơn khoảng chờ mặc định.
        availableAt: new Date(Date.now() + Math.max(config.retryMs, error.retryAfterMs || 0)),
        errorCode: error.errorCode || 'VIDEO_JOB_FAILED',
        // Chỉ hiển thị thông báo lỗi nghiệp vụ đã biết; lỗi không rõ dùng thông báo chung để không lộ chi tiết nội bộ.
        errorMessage: error.errorCode ? error.message.slice(0, 500) : 'Không thể xử lý video. Vui lòng thử lại.',
      },
    }, db);
  },
  // Khôi phục job treo (chạy định kỳ / khi khởi động worker).
  async recoverExpired({ maxAttempts, retryMs }, db = prisma) {
    // 1) Job PENDING đã hết lượt thử -> FAILED.
    await db.videoRecipeSummaryJob.updateMany({
      where: { status: 'PENDING', attempt: { gte: maxAttempts } },
      data: {
        status: 'FAILED',
        activeUserId: null,
        ...releasedLease,
        completedAt: new Date(),
        errorCode: 'VIDEO_JOB_RETRIES_EXHAUSTED',
        errorMessage: 'Tác vụ đã hết số lần thử. Vui lòng thử lại.',
      },
    });
    const expired = { status: 'PROCESSING', leaseExpiresAt: { lte: new Date() } };
    // 2) Job PROCESSING hết hạn lease và hết lượt thử -> FAILED.
    await db.videoRecipeSummaryJob.updateMany({
      where: { ...expired, attempt: { gte: maxAttempts } },
      data: {
        status: 'FAILED',
        activeUserId: null,
        ...releasedLease,
        completedAt: new Date(),
        errorCode: 'VIDEO_JOB_EXPIRED',
        errorMessage: 'Tác vụ đã hết số lần khôi phục. Vui lòng thử lại.',
      },
    });
    // 3) Job PROCESSING hết hạn lease nhưng còn lượt -> đưa về PENDING (worker cũ có thể đã chết).
    await db.videoRecipeSummaryJob.updateMany({
      where: { ...expired, attempt: { lt: maxAttempts } },
      data: { status: 'PENDING', ...releasedLease, availableAt: new Date(Date.now() + retryMs) },
    });
  },
};
