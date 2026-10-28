// D:/SWP391/SWP391/server/src/services/contentModerationService.js
import { contentModerationConfig } from '../config/contentModerationConfig.js';
import { MODERATION_PENDING_STATUS, MODERATION_RELEASED_LEASE } from '../constants/contentModeration.js';
import { contentModerationRepository as jobs } from '../repositories/contentModerationRepository.js';
import { ApiError } from '../utils/apiError.js';
import { ROLES } from '../constants/roles.js';

const receipt = (job, version) => ({ jobId: job.id, moderationStatus: 'PENDING',
  status: MODERATION_PENDING_STATUS, moderationVersion: version });

function jobView(row) {
  const { title, content, post, comment, ...job } = row;
  const target = post || comment;
  return { ...job, preview: (title || content).slice(0, 120), targetStatus: target?.status || 'DELETED',
    isCurrent: target?.moderationVersion === job.contentVersion };
}

export const contentModerationService = {
  async listJobs({ userId, page, limit }) {
    const [rows, total, pending] = await Promise.all([jobs.listOwned({ userId, page, limit }),
      jobs.countOwned({ userId }), jobs.countOwned({ userId, pending: true })]);
    return { items: rows.map(jobView), meta: { page, limit, total, pending } };
  },
  async queuePost({ post, title, content }, db) {
    if (!contentModerationConfig.enabled || !['PUBLISHED', MODERATION_PENDING_STATUS].includes(post.status)) {
      return post.moderationVersion > 0 ? jobs.invalidatePost(post.post_id, db) : {};
    }
    const staged = await jobs.stagePost(post.post_id, db);
    const job = await jobs.create({ userId: staged.author_id, postId: staged.post_id,
      contentVersion: staged.moderationVersion, title, content }, db);
    return receipt(job, staged.moderationVersion);
  },
  async queueComment({ comment }, db) {
    if (!contentModerationConfig.enabled || !['ACTIVE', MODERATION_PENDING_STATUS].includes(comment.status)) {
      return comment.moderationVersion > 0 ? jobs.invalidateComment(comment.comment_id, db) : {};
    }
    const staged = await jobs.stageComment(comment.comment_id, db);
    const job = await jobs.create({ userId: staged.user_id, commentId: staged.comment_id,
      contentVersion: staged.moderationVersion, content: staged.content }, db);
    return receipt(job, staged.moderationVersion);
  },
  async getJob({ id, user }) {
    const job = await jobs.findOwned({ id, userId: user.user_id, isAdmin: user.role === ROLES.ADMIN });
    if (!job) throw ApiError.notFound('Không tìm thấy tác vụ kiểm duyệt.');
    return job;
  },
  complete({ job, result }, repository = jobs) {
    return repository.transaction(async (tx) => {
      await repository.updateLeased({ job, data: { status: 'COMPLETED', result, completedAt: new Date(),
        ...MODERATION_RELEASED_LEASE, errorCode: null, errorMessage: null } }, tx);
      const updated = await repository.applyResult({ job, result }, tx);
      const applied = updated.count === 1;
      await repository.markApplied({ id: job.id, applied }, tx);
      return { status: 'COMPLETED', applied };
    });
  },
  async fail({ job, error, config }, repository = jobs) {
    const retry = error.retryable === true && job.attempt < config.maxAttempts;
    await repository.updateLeased({ job, data: { status: retry ? 'PENDING' : 'FAILED', ...MODERATION_RELEASED_LEASE,
      availableAt: new Date(Date.now() + config.retryMs), completedAt: retry ? null : new Date(),
      errorCode: error.errorCode || 'MODERATION_JOB_FAILED',
      errorMessage: 'Kiểm duyệt tự động chưa hoàn tất. Nội dung đang chờ quản trị viên xem xét.' } });
    return { status: retry ? 'RETRY_SCHEDULED' : 'FAILED', errorCode: error.errorCode };
  },
};
