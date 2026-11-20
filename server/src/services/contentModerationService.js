// D:/SWP391/SWP391/server/src/services/contentModerationService.js
// Nghiệp vụ kiểm duyệt nội dung tự động: đưa bài viết/bình luận vào hàng đợi, xem job và ghi nhận kết quả/thất bại từ worker.
import { contentModerationConfig } from '../config/contentModerationConfig.js';
import { MODERATION_MAX_IMAGES, MODERATION_PENDING_STATUS, MODERATION_RELEASED_LEASE } from '../constants/contentModeration.js';
import { POST_IMAGE_URL_PATTERN } from '../constants/postMedia.js';
import { contentModerationRepository as jobs } from '../repositories/contentModerationRepository.js';
import { aiLogRepository } from '../repositories/aiLogRepository.js';
import { ApiError } from '../utils/apiError.js';
import { ROLES } from '../constants/roles.js';

/** Chỉ giữ ảnh do server upload, loại trùng và giữ thứ tự hiển thị; video và ảnh thumbnail YouTube nằm ngoài phạm vi. */
export function moderationImageUrls(urls = []) {
  const images = urls.filter((url) => typeof url === 'string' && POST_IMAGE_URL_PATTERN.test(url));
  return [...new Set(images)].slice(0, MODERATION_MAX_IMAGES);
}

// So sánh hai danh sách ảnh sau chuẩn hóa; dùng để quyết định có cần kiểm duyệt lại khi sửa bài hay không.
export function haveSameModerationImages(previousUrls, nextUrls) {
  const previous = moderationImageUrls(previousUrls);
  const next = moderationImageUrls(nextUrls);
  return previous.length === next.length && previous.every((url, index) => url === next[index]);
}

// Biên nhận trả về sau khi đưa nội dung vào hàng đợi kiểm duyệt.
const receipt = (job, version) => ({ jobId: job.id, moderationStatus: 'PENDING',
  status: MODERATION_PENDING_STATUS, moderationVersion: version });

// Chuyển job sang dạng hiển thị: thêm đoạn xem trước 120 ký tự, trạng thái nội dung và cờ job có còn ứng với phiên bản hiện tại không.
function jobView(row) {
  const { title, content, post, comment, ...job } = row;
  const target = post || comment;
  return { ...job, preview: (title || content).slice(0, 120), targetStatus: target?.status || 'DELETED',
    isCurrent: target?.moderationVersion === job.contentVersion };
}

export const contentModerationService = {
  // Liệt kê job kiểm duyệt của người dùng kèm số job đang chờ.
  async listJobs({ userId, page, limit }) {
    const [rows, total, pending] = await Promise.all([jobs.listOwned({ userId, page, limit }),
      jobs.countOwned({ userId }), jobs.countOwned({ userId, pending: true })]);
    return { items: rows.map(jobView), meta: { page, limit, total, pending } };
  },
  // Đưa bài viết vào hàng đợi kiểm duyệt; tắt kiểm duyệt hoặc bài không ở trạng thái công khai/chờ duyệt thì chỉ vô hiệu hóa job cũ.
  async queuePost({ post, title, content, imageUrls = [] }, db) {
    if (!contentModerationConfig.enabled || !['PUBLISHED', MODERATION_PENDING_STATUS].includes(post.status)) {
      // Tăng moderationVersion để kết quả của job cũ (nếu còn chạy) không được áp dụng lên nội dung.
      return post.moderationVersion > 0 ? jobs.invalidatePost(post.post_id, db) : {};
    }
    // Chuyển bài sang trạng thái chờ duyệt và tăng phiên bản; job mang theo phiên bản này để chống áp kết quả lỗi thời.
    const staged = await jobs.stagePost(post.post_id, db);
    const job = await jobs.create({ userId: staged.author_id, postId: staged.post_id,
      contentVersion: staged.moderationVersion, title, content, imageUrls: moderationImageUrls(imageUrls) }, db);
    return receipt(job, staged.moderationVersion);
  },
  // Đưa bình luận vào hàng đợi kiểm duyệt (logic tương tự bài viết).
  async queueComment({ comment }, db) {
    if (!contentModerationConfig.enabled || !['ACTIVE', MODERATION_PENDING_STATUS].includes(comment.status)) {
      return comment.moderationVersion > 0 ? jobs.invalidateComment(comment.comment_id, db) : {};
    }
    const staged = await jobs.stageComment(comment.comment_id, db);
    const job = await jobs.create({ userId: staged.user_id, commentId: staged.comment_id,
      contentVersion: staged.moderationVersion, content: staged.content }, db);
    return receipt(job, staged.moderationVersion);
  },
  // Lấy job kiểm duyệt; admin xem được mọi job, người dùng chỉ xem job của mình.
  async getJob({ id, user }) {
    const job = await jobs.findOwned({ id, userId: user.user_id, isAdmin: user.role === ROLES.ADMIN });
    if (!job) throw ApiError.notFound('Không tìm thấy tác vụ kiểm duyệt.');
    return job;
  },
  // Ghi nhận kết quả kiểm duyệt: lưu kết quả, áp quyết định lên nội dung (nếu phiên bản còn khớp) và ghi log AI.
  complete({ job, result }, repository = jobs) {
    return repository.transaction(async (tx) => {
      await repository.updateLeased({ job, data: { status: 'COMPLETED', result, completedAt: new Date(),
        ...MODERATION_RELEASED_LEASE, errorCode: null, errorMessage: null } }, tx);
      const updated = await repository.applyResult({ job, result }, tx);
      // applied = false khi nội dung đã bị sửa/xóa trong lúc kiểm duyệt, nên kết quả không còn áp dụng.
      const applied = updated.count === 1;
      await repository.markApplied({ id: job.id, applied }, tx);
      try {
        await aiLogRepository.create({
          modelName: result?.modelName || 'deepseek-chat',
          action: 'SPAM_DETECTION',
          status: 'SUCCESS',
          errorFeedback: result?.decision !== 'ALLOW'
            ? `Nội dung bị gắn cờ: ${result?.categories?.join(', ') || result?.reason || 'Cần xem xét'}`
            : null,
        }, tx);
      } catch {
        // Không làm gián đoạn tiến trình kiểm duyệt nếu ghi log thất bại
      }
      return { status: 'COMPLETED', applied };
    });
  },
  // Ghi nhận thất bại: còn lượt thì lên lịch thử lại, hết lượt thì để FAILED và nội dung chờ admin xem xét.
  async fail({ job, error, config }, repository = jobs) {
    const retry = error.retryable === true && job.attempt < config.maxAttempts;
    await repository.updateLeased({ job, data: { status: retry ? 'PENDING' : 'FAILED', ...MODERATION_RELEASED_LEASE,
      availableAt: new Date(Date.now() + config.retryMs), completedAt: retry ? null : new Date(),
      errorCode: error.errorCode || 'MODERATION_JOB_FAILED',
      errorMessage: 'Kiểm duyệt tự động chưa hoàn tất. Nội dung đang chờ quản trị viên xem xét.' } });
    // Chỉ ghi log lỗi khi thất bại hẳn, tránh log trùng cho mỗi lần thử lại.
    if (!retry) {
      try {
        await aiLogRepository.create({
          modelName: 'deepseek-chat',
          action: 'SPAM_DETECTION',
          status: 'ERROR',
          errorFeedback: error.errorCode || 'MODERATION_JOB_FAILED',
        });
      } catch {
        // Không làm gián đoạn tiến trình kiểm duyệt nếu ghi log thất bại
      }
    }
    return { status: retry ? 'RETRY_SCHEDULED' : 'FAILED', errorCode: error.errorCode };
  },
};
