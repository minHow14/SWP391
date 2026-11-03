// D:/SWP391/SWP391/server/src/repositories/contentModerationRepository.js
import { randomUUID } from 'node:crypto';
import prisma from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { MODERATION_PENDING_STATUS, MODERATION_RELEASED_LEASE } from '../constants/contentModeration.js';
import { POST_STATUS, COMMENT_STATUS } from '../constants/status.js';

const PUBLIC_SELECT = { id: true, postId: true, commentId: true, contentVersion: true, status: true,
  result: true, applied: true, errorCode: true, errorMessage: true, completedAt: true, createdAt: true, updatedAt: true };
const INTERNAL_SELECT = { ...PUBLIC_SELECT, userId: true, title: true, content: true,
  attempt: true, availableAt: true, leaseToken: true, leaseExpiresAt: true };

export function moderationLeaseLost() {
  return Object.assign(ApiError.conflict('Quyền xử lý tác vụ kiểm duyệt đã hết hạn.'), { errorCode: 'MODERATION_LEASE_LOST' });
}

function guardedDecision(work) {
  return work.catch((error) => {
    if (error.code === 'P2025') throw ApiError.conflict('Nội dung đã thay đổi hoặc không còn trong hàng chờ. Vui lòng làm mới.');
    throw error;
  });
}

export const contentModerationRepository = {
  resolvePost({ id, contentVersion, data }, db = prisma) {
    return guardedDecision(db.post.update({ where: { post_id: id, deleted_at: null,
      status: { in: [POST_STATUS.HIDDEN_BY_AI, MODERATION_PENDING_STATUS] },
      ...(contentVersion !== undefined && { moderationVersion: contentVersion }) }, data }));
  },
  resolveComment({ id, contentVersion, data }, db = prisma) {
    return guardedDecision(db.comment.update({ where: { comment_id: id, deleted_at: null,
      OR: [{ status: { in: [COMMENT_STATUS.HIDDEN_BY_AI, MODERATION_PENDING_STATUS] } },
        { status: COMMENT_STATUS.ACTIVE, is_flagged_by_ai: true }],
      ...(contentVersion !== undefined && { moderationVersion: contentVersion }) }, data }));
  },
  transaction(work, db = prisma) { return db.$transaction(work); },
  create(data, db = prisma) { return db.contentModerationJob.create({ data, select: INTERNAL_SELECT }); },
  findOwned({ id, userId, isAdmin = false }, db = prisma) {
    return db.contentModerationJob.findFirst({ where: { id, ...(!isAdmin && { userId }) }, select: PUBLIC_SELECT });
  },
  listOwned({ userId, page, limit }, db = prisma) {
    return db.contentModerationJob.findMany({ where: { userId },
      select: { ...PUBLIC_SELECT, title: true, content: true,
        post: { select: { status: true, moderationVersion: true } },
        comment: { select: { status: true, moderationVersion: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit });
  },
  countOwned({ userId, pending = false }, db = prisma) {
    return db.contentModerationJob.count({ where: { userId, ...(pending && { status: { in: ['PENDING', 'PROCESSING'] } }) } });
  },
  findForTargets(targets, db = prisma) {
    if (!targets.length) return Promise.resolve([]);
    return db.contentModerationJob.findMany({ where: { OR: targets }, select: PUBLIC_SELECT });
  },
  stagePost(postId, db = prisma) {
    return db.post.update({ where: { post_id: postId, deleted_at: null,
      status: { in: ['PUBLISHED', MODERATION_PENDING_STATUS] } },
    data: { status: MODERATION_PENDING_STATUS, moderationVersion: { increment: 1 } },
    select: { post_id: true, author_id: true, moderationVersion: true } });
  },
  stageComment(commentId, db = prisma) {
    return db.comment.update({ where: { comment_id: commentId, deleted_at: null,
      status: { in: ['ACTIVE', MODERATION_PENDING_STATUS] } },
    data: { status: MODERATION_PENDING_STATUS, is_flagged_by_ai: false, moderationVersion: { increment: 1 } },
    select: { comment_id: true, user_id: true, content: true, moderationVersion: true } });
  },
  invalidatePost(postId, db = prisma) {
    return db.post.update({ where: { post_id: postId }, data: { moderationVersion: { increment: 1 } },
      select: { moderationVersion: true } });
  },
  invalidateComment(commentId, db = prisma) {
    return db.comment.update({ where: { comment_id: commentId }, data: { moderationVersion: { increment: 1 } },
      select: { moderationVersion: true } });
  },
  claim({ leaseMs, maxAttempts }, db = prisma) {
    return db.$transaction(async (tx) => {
      const [candidate] = await tx.$queryRaw`SELECT id FROM content_moderation_jobs
        WHERE status = 'PENDING' AND available_at <= NOW() AND attempt < ${maxAttempts}
        ORDER BY available_at, created_at, id FOR UPDATE SKIP LOCKED LIMIT 1`;
      if (!candidate) return null;
      return tx.contentModerationJob.update({ where: { id: candidate.id }, select: INTERNAL_SELECT,
        data: { status: 'PROCESSING', attempt: { increment: 1 }, leaseToken: randomUUID(),
          leaseExpiresAt: new Date(Date.now() + leaseMs) } });
    });
  },
  async updateLeased({ job, data }, db = prisma) {
    const updated = await db.contentModerationJob.updateMany({ where: { id: job.id, leaseToken: job.leaseToken,
      status: 'PROCESSING', leaseExpiresAt: { gt: new Date() } }, data });
    if (updated.count !== 1) throw moderationLeaseLost();
  },
  async applyResult({ job, result }, db = prisma) {
    const where = { moderationVersion: job.contentVersion, status: MODERATION_PENDING_STATUS, deleted_at: null };
    const flagged = result.decision === 'REVIEW';
    if (job.postId) return db.post.updateMany({ where: { ...where, post_id: job.postId },
      data: { status: flagged ? 'HIDDEN_BY_AI' : 'PUBLISHED' } });
    // Parent visibility is enforced by public reads; its pending scan must not discard this decision.
    return db.comment.updateMany({ where: { ...where, comment_id: job.commentId },
    data: { status: flagged ? 'HIDDEN_BY_AI' : 'ACTIVE', is_flagged_by_ai: flagged } });
  },
  markApplied({ id, applied }, db = prisma) {
    return db.contentModerationJob.update({ where: { id }, data: { applied }, select: PUBLIC_SELECT });
  },
  async recoverExpired({ maxAttempts, retryMs }, db = prisma) {
    const expired = { status: 'PROCESSING', leaseExpiresAt: { lte: new Date() } };
    await db.contentModerationJob.updateMany({ where: { attempt: { gte: maxAttempts },
      OR: [{ status: 'PENDING' }, expired] }, data: { status: 'FAILED', ...MODERATION_RELEASED_LEASE,
      completedAt: new Date(), errorCode: 'MODERATION_RETRIES_EXHAUSTED',
      errorMessage: 'Kiểm duyệt tự động chưa hoàn tất. Nội dung cần quản trị viên xem xét.' } });
    await db.contentModerationJob.updateMany({ where: { ...expired, attempt: { lt: maxAttempts } },
      data: { status: 'PENDING', ...MODERATION_RELEASED_LEASE, availableAt: new Date(Date.now() + retryMs) } });
  },
};
