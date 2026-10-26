// D:/SWP391/SWP391/server/src/repositories/videoRecipeSummaryJobRepository.js
import { randomUUID } from 'node:crypto';
import prisma from '../config/prisma.js';
import { lostVideoRecipeLease } from '../utils/videoRecipeSummaryError.js';
import { videoRecipeSummaryRepository } from './videoRecipeSummaryRepository.js';

const PUBLIC_SELECT = { id: true, videoId: true, videoUrl: true, status: true, stage: true,
  errorCode: true, errorMessage: true, completedAt: true, createdAt: true, updatedAt: true,
  summary: { select: { id: true } } };
const INTERNAL_SELECT = { ...PUBLIC_SELECT, userId: true, activeUserId: true, pipelineVersion: true,
  attempt: true, availableAt: true, leaseToken: true, leaseExpiresAt: true, metadata: true, transcript: true };
const ownedWhere = ({ userId, status }) => ({ userId, ...(status && { status }) });
const leaseWhere = ({ id, leaseToken }) => ({ id, leaseToken, status: 'PROCESSING', leaseExpiresAt: { gt: new Date() } });
const releasedLease = { leaseToken: null, leaseExpiresAt: null };

async function updateLeased({ id, leaseToken, data }, db = prisma) {
  const result = await db.videoRecipeSummaryJob.updateMany({ where: leaseWhere({ id, leaseToken }), data });
  if (result.count !== 1) throw lostVideoRecipeLease();
}

export const videoRecipeSummaryJobRepository = {
  runTransaction(work, db = prisma) { return db.$transaction(work); },
  create(data, db = prisma) { return db.videoRecipeSummaryJob.create({ data, select: INTERNAL_SELECT }); },
  findSource({ userId, videoId, pipelineVersion }, db = prisma) {
    return db.videoRecipeSummaryJob.findUnique({ where: { userId_videoId_pipelineVersion: { userId, videoId, pipelineVersion } }, select: INTERNAL_SELECT });
  },
  findOwned({ id, userId }, db = prisma) {
    return db.videoRecipeSummaryJob.findFirst({ where: { id, userId }, select: PUBLIC_SELECT });
  },
  findOwnedInternal({ id, userId }, db = prisma) {
    return db.videoRecipeSummaryJob.findFirst({ where: { id, userId }, select: INTERNAL_SELECT });
  },
  findActive({ userId }, db = prisma) {
    return db.videoRecipeSummaryJob.findFirst({ where: { activeUserId: userId }, select: INTERNAL_SELECT });
  },
  listOwned(query, db = prisma) {
    return db.videoRecipeSummaryJob.findMany({ where: ownedWhere(query), select: PUBLIC_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.limit, take: query.limit });
  },
  countOwned(query, db = prisma) { return db.videoRecipeSummaryJob.count({ where: ownedWhere(query) }); },
  async requeue({ job }, db = prisma) {
    const result = await db.videoRecipeSummaryJob.updateMany({ where: { id: job.id, userId: job.userId, status: 'FAILED' },
      data: { status: 'PENDING', activeUserId: job.userId, attempt: 0, availableAt: new Date(), ...releasedLease,
        stage: job.transcript ? 'SUMMARIZING' : 'VALIDATING_VIDEO', errorCode: null, errorMessage: null, completedAt: null } });
    return result.count;
  },
  claim({ leaseMs, maxAttempts }, db = prisma) {
    return db.$transaction(async (tx) => {
      const [candidate] = await tx.$queryRaw`SELECT id FROM video_recipe_summary_jobs
        WHERE status = 'PENDING' AND available_at <= NOW() AND attempt < ${maxAttempts}
        ORDER BY available_at, created_at, id FOR UPDATE SKIP LOCKED LIMIT 1`;
      if (!candidate) return null;
      return tx.videoRecipeSummaryJob.update({ where: { id: candidate.id }, select: INTERNAL_SELECT,
        data: { status: 'PROCESSING', attempt: { increment: 1 }, leaseToken: randomUUID(), leaseExpiresAt: new Date(Date.now() + leaseMs) } });
    });
  },
  updateLeased,
  renew({ job, leaseMs }, db = prisma) {
    return updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { leaseExpiresAt: new Date(Date.now() + leaseMs) } }, db);
  },
  complete({ job, recipe }, db = prisma) {
    return db.$transaction(async (tx) => {
      await updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { status: 'COMPLETED',
        stage: 'SAVING_RESULT', activeUserId: null, ...releasedLease, completedAt: new Date(), errorCode: null, errorMessage: null } }, tx);
      return videoRecipeSummaryRepository.create({ job, recipe }, tx);
    });
  },
  fail({ job, error, config }, db = prisma) {
    const retry = error.retryable && job.attempt < config.maxAttempts;
    return updateLeased({ id: job.id, leaseToken: job.leaseToken, data: { status: retry ? 'PENDING' : 'FAILED',
      activeUserId: retry ? job.userId : null, ...releasedLease, completedAt: retry ? null : new Date(),
      availableAt: new Date(Date.now() + Math.max(config.retryMs, error.retryAfterMs || 0)),
      errorCode: error.errorCode || 'VIDEO_JOB_FAILED', errorMessage: error.errorCode ? error.message.slice(0, 500) : 'Không thể xử lý video. Vui lòng thử lại.' } }, db);
  },
  async recoverExpired({ maxAttempts, retryMs }, db = prisma) {
    await db.videoRecipeSummaryJob.updateMany({ where: { status: 'PENDING', attempt: { gte: maxAttempts } },
      data: { status: 'FAILED', activeUserId: null, ...releasedLease, completedAt: new Date(),
        errorCode: 'VIDEO_JOB_RETRIES_EXHAUSTED', errorMessage: 'Tác vụ đã hết số lần thử. Vui lòng thử lại.' } });
    const expired = { status: 'PROCESSING', leaseExpiresAt: { lte: new Date() } };
    await db.videoRecipeSummaryJob.updateMany({ where: { ...expired, attempt: { gte: maxAttempts } },
      data: { status: 'FAILED', activeUserId: null, ...releasedLease, completedAt: new Date(),
        errorCode: 'VIDEO_JOB_EXPIRED', errorMessage: 'Tác vụ đã hết số lần khôi phục. Vui lòng thử lại.' } });
    await db.videoRecipeSummaryJob.updateMany({ where: { ...expired, attempt: { lt: maxAttempts } },
      data: { status: 'PENDING', ...releasedLease, availableAt: new Date(Date.now() + retryMs) } });
  },
};
