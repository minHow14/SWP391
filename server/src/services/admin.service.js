// server/src/services/admin.service.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { USER_STATUS, POST_STATUS, COMMENT_STATUS, REPORT_STATUS } from '../constants/status.js';
import { aiLogRepository } from '../repositories/aiLogRepository.js';
import { aiLogService } from './aiLogService.js';
import { postRepository } from '../repositories/post.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { commentRepository } from '../repositories/comment.repository.js';
import { categoryRepository } from '../repositories/category.repository.js';
import { reportRepository } from '../repositories/report.repository.js';
import { aiService } from './ai.service.js';
import { guestQuotaService } from './guestQuotaService.js';
import { guestQuotaAdminService } from './guestQuotaAdminService.js';
import { notificationService } from './notification.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * FE-01: Quản lý thành viên (Users)
 */
export const getUsers = async ({ page = 1, limit = 10, search = '', status = '', role = null }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where = {};
  if (status) where.status = status;
  if (role !== null && role !== undefined && role !== '') where.role = Number(role);
  if (search) {
    where.OR = [
      { full_name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await Promise.all([
    userRepository.count({ where }),
    userRepository.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      select: {
        user_id: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        created_at: true,
        deleted_at: true,
        _count: {
          select: {
            posts: true,
            comments: true,
            reports: true,
          },
        },
      },
    }),
  ]);

  return { users, total, page: Number(page), limit: Number(limit) };
};

export const getUserContent = async (userId) => {
  const targetId = Number(userId);
  const user = await userRepository.findById(targetId, {
    user_id: true,
    full_name: true,
    email: true,
    status: true,
  });
  if (!user) throw ApiError.notFound('Không tìm thấy thành viên');

  const [posts, comments] = await Promise.all([
    postRepository.findPosts({
      where: { author_id: targetId },
      orderBy: { created_at: 'desc' },
      include: {
        blog: true,
        video: true,
        post_categories: { include: { category: true } },
      },
    }),
    commentRepository.findMany({
      where: { user_id: targetId },
      orderBy: { created_at: 'desc' },
      include: {
        post: {
          select: {
            post_id: true,
            post_type: true,
            blog: { select: { title: true } },
            video: { select: { title: true } },
          },
        },
      },
    }),
  ]);

  return { user, posts, comments };
};

export const updateUserStatus = async ({ targetUserId, status, currentAdminId }) => {
  const id = Number(targetUserId);
  if (id === currentAdminId) {
    throw ApiError.badRequest('Không thể tự thay đổi trạng thái của chính tài khoản đang đăng nhập');
  }

  const user = await userRepository.findById(id);
  if (!user) throw ApiError.notFound('Không tìm thấy người dùng');

  const isDeleting = status === USER_STATUS.DELETED;
  const deletedAt = isDeleting ? new Date() : null;

  return userRepository.update(
    id,
    { status, deleted_at: deletedAt },
    { user_id: true, email: true, full_name: true, status: true, role: true, deleted_at: true }
  );
};

export const deleteUser = async ({ targetUserId, currentAdminId }) => {
  const id = Number(targetUserId);
  if (id === currentAdminId) {
    throw ApiError.badRequest('Không thể tự xóa tài khoản của chính mình');
  }

  const user = await userRepository.findById(id);
  if (!user) throw ApiError.notFound('Không tìm thấy người dùng');

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    // Chỉ soft-delete các bình luận đang hoạt động (không đè lên bình luận đã xóa từ trước)
    await commentRepository.updateMany(
      { user_id: id, status: { not: COMMENT_STATUS.DELETED } },
      { status: COMMENT_STATUS.DELETED, deleted_at: now },
      tx
    );
    // Chỉ soft-delete các bài viết chưa bị xóa từ trước
    await tx.post.updateMany({
      where: { author_id: id, status: { not: POST_STATUS.DELETED } },
      data: { status: POST_STATUS.DELETED, deleted_at: now },
    });
    return userRepository.update(
      id,
      { status: USER_STATUS.DELETED, deleted_at: now },
      { user_id: true, email: true, full_name: true, status: true, deleted_at: true },
      tx
    );
  });
};

export const restoreUser = async (userId) => {
  const id = Number(userId);
  const user = await userRepository.findById(id);
  if (!user) throw ApiError.notFound('Không tìm thấy người dùng');
  if (user.status !== USER_STATUS.DELETED) {
    throw ApiError.badRequest('Tài khoản này không ở trạng thái đã xóa');
  }

  const userDeletedAt = user.deleted_at;

  return prisma.$transaction(async (tx) => {
    // Chỉ khôi phục bài viết và bình luận bị xóa cùng lúc với tài khoản (tránh hồi sinh bài/comment vi phạm đã xóa trước đó)
    if (userDeletedAt) {
      await commentRepository.updateMany(
        { user_id: id, status: COMMENT_STATUS.DELETED, deleted_at: userDeletedAt },
        { status: COMMENT_STATUS.ACTIVE, deleted_at: null },
        tx
      );
      await tx.post.updateMany({
        where: { author_id: id, status: POST_STATUS.DELETED, deleted_at: userDeletedAt },
        data: { status: POST_STATUS.PUBLISHED, deleted_at: null },
      });
    }
    return userRepository.update(
      id,
      { status: USER_STATUS.ACTIVE, deleted_at: null },
      { user_id: true, email: true, full_name: true, status: true, deleted_at: true },
      tx
    );
  });
};

/**
 * FE-02: Quản lý bài viết và video
 */
export const getPosts = async ({ page = 1, limit = 10, postType = '', status = '', search = '' }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where = {};
  if (postType) where.post_type = postType;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { blog: { title: { contains: search, mode: 'insensitive' } } },
      { video: { title: { contains: search, mode: 'insensitive' } } },
      { author: { full_name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [total, posts] = await Promise.all([
    postRepository.countPosts({ where }),
    postRepository.findPosts({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        author: { select: { user_id: true, full_name: true, email: true } },
        blog: true,
        video: true,
        post_categories: { include: { category: true } },
        _count: { select: { comments: true, reports: true } },
      },
    }),
  ]);

  return { posts, total, page: Number(page), limit: Number(limit) };
};

export const updatePostStatus = async ({ postId, status }) => {
  const id = Number(postId);
  const post = await postRepository.findPostById(id);
  if (!post) throw ApiError.notFound('Không tìm thấy bài viết hoặc video');

  const isDeleting = status === POST_STATUS.DELETED;
  const deletedAt = isDeleting ? new Date() : null;

  return postRepository.updatePost(
    id,
    { status, deleted_at: deletedAt },
    { blog: true, video: true }
  );
};

export const updatePost = async ({ postId, title, content }) => {
  const id = Number(postId);
  const post = await postRepository.findPostById(id, { blog: true, video: true });
  if (!post) throw ApiError.notFound('Không tìm thấy bài đăng');

  if (post.post_type === 'BLOG' && post.blog) {
    await postRepository.updateBlog(id, {
      title: title || post.blog.title,
      content: content || post.blog.content,
    });
  } else if (post.post_type === 'VIDEO' && post.video) {
    await postRepository.updateVideo(id, {
      title: title || post.video.title,
      transcript: content !== undefined ? content : post.video.transcript,
    });
  }

  return postRepository.findPostById(id, {
    blog: true,
    video: true,
    author: { select: { full_name: true } },
  });
};

export const deletePost = async (postId, { permanent = false } = {}) => {
  const id = Number(postId);
  const post = await postRepository.findPostById(id, {
    blog: true,
    video: true,
    attachments: true,
  });
  if (!post) throw ApiError.notFound('Không tìm thấy bài đăng');

  if (permanent) {
    // 1. Thu thập danh sách tệp đính kèm/video trên đĩa để dọn dẹp dung lượng
    const filesToCleanup = [];
    if (post.attachments && post.attachments.length > 0) {
      for (const att of post.attachments) {
        if (att.file_url) filesToCleanup.push(att.file_url);
      }
    }
    if (post.video) {
      if (post.video.video_url) filesToCleanup.push(post.video.video_url);
      if (post.video.thumbnail_url) filesToCleanup.push(post.video.thumbnail_url);
    }

    // 2. Xóa cứng hoàn toàn khỏi cơ sở dữ liệu
    await postRepository.hardDeletePost(id);

    // 3. Dọn dẹp các tệp tĩnh trên đĩa nếu được lưu cục bộ trong /uploads/
    for (const fileUrl of filesToCleanup) {
      if (typeof fileUrl === 'string' && fileUrl.startsWith('/uploads/')) {
        const relativeFilePath = fileUrl.replace(/^\//, '');
        const filePath = path.resolve(__dirname, '../../', relativeFilePath);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch {
          // Bỏ qua nếu tệp đã không còn trên đĩa
        }
      }
    }

    return { post_id: id, message: 'Xóa vĩnh viễn bài viết hoặc video thành công', permanent: true };
  }

  const now = new Date();
  // Nếu permanent = false: Đánh dấu HIDDEN (trạng thái Đã ẩn, vẫn hiển thị trên bảng để Admin quản lý/khôi phục)
  return prisma.$transaction(async (tx) => {
    // Chỉ ẩn các bình luận đang ACTIVE
    await commentRepository.updateMany(
      { post_id: id, status: COMMENT_STATUS.ACTIVE },
      { status: COMMENT_STATUS.HIDDEN, deleted_at: now },
      tx
    );
    const updatedPost = await postRepository.updatePost(
      id,
      { status: POST_STATUS.HIDDEN, deleted_at: now },
      null,
      tx
    );
    return { ...updatedPost, permanent: false };
  });
};

export const restorePost = async (postId) => {
  const id = Number(postId);
  const post = await postRepository.findPostById(id);
  if (!post) throw ApiError.notFound('Không tìm thấy bài đăng');
  if (post.status !== POST_STATUS.HIDDEN && post.status !== POST_STATUS.DELETED) {
    throw ApiError.badRequest('Bài đăng này không ở trạng thái ẩn hoặc đã xóa');
  }

  const postDeletedAt = post.deleted_at;

  return prisma.$transaction(async (tx) => {
    // Chỉ khôi phục các bình luận bị ẩn cùng lúc với bài đăng (không khôi phục các bình luận vi phạm hay đã bị xóa từ trước)
    if (postDeletedAt) {
      await commentRepository.updateMany(
        { post_id: id, status: COMMENT_STATUS.HIDDEN, deleted_at: postDeletedAt },
        { status: COMMENT_STATUS.ACTIVE, deleted_at: null },
        tx
      );
    }
    return postRepository.updatePost(
      id,
      { status: POST_STATUS.PUBLISHED, deleted_at: null },
      { blog: true, video: true },
      tx
    );
  });
};

/**
 * FE-03: Quản lý bình luận
 */
export const getComments = async ({ page = 1, limit = 10, status = '', isFlagged = null, search = '' }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where = {};
  if (status) {
    where.status = status;
  } else {
    // Mặc định: loại bỏ các bình luận đã xóa vĩnh viễn (DELETED) khỏi bảng danh sách quản lý
    where.status = { not: COMMENT_STATUS.DELETED };
  }
  if (isFlagged !== null && isFlagged !== undefined && isFlagged !== '') {
    where.is_flagged_by_ai = isFlagged === 'true' || isFlagged === true;
  }
  if (search) {
    where.content = { contains: search, mode: 'insensitive' };
  }

  const [total, comments] = await Promise.all([
    commentRepository.count({ where }),
    commentRepository.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { user_id: true, full_name: true, email: true } },
        post: {
          select: {
            post_id: true,
            post_type: true,
            blog: { select: { title: true } },
            video: { select: { title: true } },
          },
        },
        _count: { select: { reports: true } },
      },
    }),
  ]);

  return { comments, total, page: Number(page), limit: Number(limit) };
};

export const updateCommentStatus = async ({ commentId, status }) => {
  const id = Number(commentId);
  const comment = await commentRepository.findById(id);
  if (!comment) throw ApiError.notFound('Không tìm thấy bình luận');

  const isDeleting = status === COMMENT_STATUS.DELETED;
  const deletedAt = isDeleting ? new Date() : null;

  return commentRepository.update(
    id,
    { status, deleted_at: deletedAt },
    { user: { select: { full_name: true } } }
  );
};

export const deleteComment = async (commentId, { permanent = false } = {}) => {
  const id = Number(commentId);
  const comment = await commentRepository.findById(id);
  if (!comment) throw ApiError.notFound('Không tìm thấy bình luận');

  // Nếu permanent = true: Đánh dấu DELETED (biến mất khỏi bảng quản lý Admin)
  // Nếu permanent = false: Đánh dấu HIDDEN (trạng thái Đã ẩn, vẫn hiển thị trên bảng để Admin quản lý/khôi phục)
  const nextStatus = permanent ? COMMENT_STATUS.DELETED : COMMENT_STATUS.HIDDEN;
  const updatedComment = await commentRepository.update(id, {
    status: nextStatus,
    deleted_at: new Date(),
  });
  return { ...updatedComment, permanent };
};

export const restoreComment = async (commentId) => {
  const id = Number(commentId);
  const comment = await commentRepository.findById(id);
  if (!comment) throw ApiError.notFound('Không tìm thấy bình luận');
  if (comment.status !== COMMENT_STATUS.HIDDEN && comment.status !== COMMENT_STATUS.DELETED) {
    throw ApiError.badRequest('Bình luận này không ở trạng thái ẩn hoặc đã xóa');
  }

  return commentRepository.update(
    id,
    { status: COMMENT_STATUS.ACTIVE, deleted_at: null },
    { user: { select: { full_name: true } } }
  );
};

/**
 * FE-04: Quản lý danh mục
 */
export const getCategories = async () => {
  return categoryRepository.findMany({
    orderBy: { category_id: 'asc' },
    include: {
      recipes: {
        select: {
          recipe_id: true,
          recipe_name: true,
          description: true,
          image_url: true,
          prep_time: true,
          total_calories: true,
          instructions: true,
        },
      },
      post_categories: {
        include: {
          post: {
            select: {
              post_id: true,
              post_type: true,
              status: true,
              created_at: true,
              blog: { select: { title: true, content: true } },
              video: { select: { title: true, video_url: true, transcript: true } },
              author: { select: { full_name: true, email: true } },
            },
          },
        },
      },
      _count: {
        select: {
          post_categories: true,
          recipes: true,
        },
      },
    },
  });
};

export const createCategory = async ({ name }) => {
  const trimmed = name?.trim();
  if (!trimmed) throw ApiError.badRequest('Tên danh mục không được để trống');

  const existing = await categoryRepository.findByName(trimmed);
  if (existing) throw ApiError.conflict('Tên danh mục đã tồn tại');

  return categoryRepository.create({ name: trimmed });
};

export const updateCategory = async ({ categoryId, name }) => {
  const id = Number(categoryId);
  const trimmed = name?.trim();
  if (!trimmed) throw ApiError.badRequest('Tên danh mục không được để trống');

  const category = await categoryRepository.findById(id);
  if (!category) throw ApiError.notFound('Không tìm thấy danh mục');

  const existing = await categoryRepository.findFirst({
    where: { name: trimmed, category_id: { not: id } },
  });
  if (existing) throw ApiError.conflict('Tên danh mục đã được sử dụng');

  return categoryRepository.update(id, { name: trimmed });
};

export const deleteCategory = async (categoryId) => {
  const id = Number(categoryId);
  const category = await categoryRepository.findById(id);
  if (!category) throw ApiError.notFound('Không tìm thấy danh mục');

  const [postCategoryCount, recipeCount] = await Promise.all([
    postRepository.countPosts({
      where: { post_categories: { some: { category_id: id } } },
    }),
    categoryRepository.countRecipesByCategoryId(id),
  ]);

  if (postCategoryCount > 0 || recipeCount > 0) {
    throw ApiError.badRequest('Không thể xóa danh mục đang có bài viết hoặc công thức nấu ăn liên kết');
  }

  return categoryRepository.delete(id);
};

/**
 * FE-05: Kiểm duyệt nội dung gắn cờ tự động bởi AI
 */
export const getAiFlaggedContent = async () => {
  const [flaggedPosts, flaggedComments] = await Promise.all([
    postRepository.findPosts({
      where: { status: POST_STATUS.HIDDEN_BY_AI },
      orderBy: { created_at: 'desc' },
      include: {
        author: { select: { user_id: true, full_name: true, email: true } },
        blog: true,
        video: true,
      },
    }),
    commentRepository.findMany({
      where: {
        OR: [{ status: COMMENT_STATUS.HIDDEN_BY_AI }, { is_flagged_by_ai: true }],
      },
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { user_id: true, full_name: true, email: true } },
        post: {
          select: {
            post_id: true,
            blog: { select: { title: true } },
            video: { select: { title: true } },
          },
        },
      },
    }),
  ]);

  return {
    posts: flaggedPosts,
    comments: flaggedComments,
    totalFlagged: flaggedPosts.length + flaggedComments.length,
  };
};

export const resolveAiFlaggedItem = async ({ entityType, entityId, action, notes = '' }) => {
  const id = Number(entityId);
  const type = entityType?.toUpperCase();
  const normalizedAction = action?.toUpperCase();

  if (type === 'POST') {
    const post = await postRepository.findPostById(id);
    if (!post) throw ApiError.notFound('Không tìm thấy bài viết');

    if (normalizedAction === 'APPROVE') {
      const updated = await postRepository.updatePost(id, {
        status: POST_STATUS.PUBLISHED,
      });

      await aiLogService.recordLog({
        modelName: 'deepseek-chat',
        action: 'MODERATION_MANUAL_OVERRIDE',
        status: 'SUCCESS',
        errorFeedback: `Admin phê duyệt nội dung bài viết ID ${id}. Ghi chú: ${notes || 'Không có'}`,
      });
      return updated;
    }

    // Khi gỡ bỏ bài viết bị AI gắn cờ: Cập nhật DELETED (không xóa cứng khỏi DB)
    const updated = await prisma.$transaction(async (tx) => {
      await commentRepository.updateMany(
        { post_id: id },
        { status: COMMENT_STATUS.DELETED, deleted_at: new Date() },
        tx
      );
      const res = await postRepository.updatePost(
        id,
        { status: POST_STATUS.DELETED, deleted_at: new Date() },
        null,
        tx
      );
      await aiLogService.recordLog(
        {
          modelName: 'deepseek-chat',
          action: 'MODERATION_MANUAL_OVERRIDE',
          status: 'SUCCESS',
          errorFeedback: `Admin kiểm duyệt và gỡ bỏ bài viết ID ${id}. Ghi chú: ${notes || 'Nội dung vi phạm'}`,
        },
        tx
      );
      return res;
    });

    return { id, action: 'REMOVED', entityType: 'POST', data: updated };
  }

  if (type === 'COMMENT') {
    const comment = await commentRepository.findById(id);
    if (!comment) throw ApiError.notFound('Không tìm thấy bình luận');

    if (normalizedAction === 'APPROVE') {
      const updated = await commentRepository.update(id, {
        status: COMMENT_STATUS.ACTIVE,
        is_flagged_by_ai: false,
      });

      await aiLogService.recordLog({
        modelName: 'deepseek-chat',
        action: 'MODERATION_MANUAL_OVERRIDE',
        status: 'SUCCESS',
        errorFeedback: `Admin phê duyệt bình luận ID ${id}. Ghi chú: ${notes || 'Không có'}`,
      });
      return updated;
    }

    // Khi gỡ bỏ bình luận bị AI gắn cờ: Cập nhật DELETED (không xóa cứng khỏi DB)
    const updated = await prisma.$transaction(async (tx) => {
      const res = await commentRepository.update(
        id,
        { status: COMMENT_STATUS.DELETED, deleted_at: new Date() },
        null,
        tx
      );
      await aiLogService.recordLog(
        {
          modelName: 'deepseek-chat',
          action: 'MODERATION_MANUAL_OVERRIDE',
          status: 'SUCCESS',
          errorFeedback: `Admin kiểm duyệt và gỡ bỏ bình luận ID ${id}. Ghi chú: ${notes || 'Bình luận vi phạm'}`,
        },
        tx
      );
      return res;
    });

    return { id, action: 'REMOVED', entityType: 'COMMENT', data: updated };
  }

  throw ApiError.badRequest('Loại đối tượng không hợp lệ (hỗ trợ POST hoặc COMMENT)');
};

/**
 * FE-06 & FE-07: Giám sát mô hình AI, xem logs & metrics
 */
export const getAiModelsStatus = async () => {
  const logs = await aiLogRepository.findRecent();

  const models = [
    {
      id: 'recommendation',
      name: 'Recommendation Engine',
      type: 'Gợi ý món ăn & quán chay',
      provider: 'Internal / DeepSeek',
      actions: ['NUTRIENT_ANALYSIS', 'RECOMMENDATION'],
    },
    {
      id: 'chatbot',
      name: 'Chatbot Dinh Dưỡng',
      type: 'Tư vấn thực đơn & hỏi đáp',
      provider: 'DeepSeek Chat',
      actions: ['CHATBOT_GUEST_QUERY', 'CHAT_STREAM_GUEST', 'CHAT_STREAM_USER'],
    },
    {
      id: 'moderation',
      name: 'Content Moderation',
      type: 'Kiểm duyệt spam & nội dung độc hại',
      provider: 'DeepSeek Filter',
      actions: ['SPAM_DETECTION', 'MODERATION_MANUAL_OVERRIDE'],
    },
    {
      id: 'food-scanner',
      name: 'Smart Food & Label Scanner',
      type: 'Giám định thành phần qua hình ảnh (AI Vision)',
      provider: 'DeepSeek Vision / FastAPI',
      actions: ['FOOD_SCAN_USER', 'FOOD_SCAN_GUEST', 'FOOD_SCAN'],
    },
    {
      id: 'video-recipe',
      name: 'Video Recipe Summary',
      type: 'Trích xuất công thức YouTube (Transcription & LLM)',
      provider: 'Groq Whisper / DeepSeek',
      actions: ['VIDEO_RECIPE_SUMMARY', 'VIDEO_RECIPE'],
    },
  ];

  return models.map((m) => {
    const modelLogs = logs.filter((l) => m.actions.some((prefix) => l.action?.startsWith(prefix)));
    const totalCalls = modelLogs.length;
    const errorCalls = modelLogs.filter((l) => l.status === 'ERROR').length;
    const successRate = totalCalls > 0 ? Math.round(((totalCalls - errorCalls) / totalCalls) * 100) : 100;
    const lastActive = modelLogs[0]?.createdAt || null;

    return {
      ...m,
      status: errorCalls > 2 ? 'DEGRADED' : 'HEALTHY',
      totalCalls,
      errorCalls,
      successRate,
      lastActive,
    };
  });
};

export const getAiLogs = async ({ page = 1, limit = 10, modelName = '', action = '', status = '', search = '', dateFrom, dateTo, feature }) => {
  const result = await aiLogService.listLogs({
    page,
    limit,
    ...(modelName ? { modelName } : {}),
    ...(action ? { action } : {}),
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(feature ? { feature } : {}),
  });
  return { logs: result.items, total: result.total, page: result.page, limit: result.limit };
};

export const getAiMetrics = async () => {
  const [total, successCount, errorCount, flaggedCount] = await Promise.all([
    aiLogRepository.count(),
    aiLogRepository.count({ status: 'SUCCESS' }),
    aiLogRepository.count({ status: 'ERROR' }),
    postRepository.countPosts({ where: { status: POST_STATUS.HIDDEN_BY_AI } }),
  ]);

  const accuracy = total > 0 ? Math.round((successCount / total) * 100) : 100;

  return {
    totalRequests: total,
    successRequests: successCount,
    errorRequests: errorCount,
    flaggedItemsPending: flaggedCount,
    accuracyRate: accuracy,
  };
};

/**
 * Thống kê chi tiết hoạt động AI theo ngày, chức năng và mô hình
 */
export const getAiLogStats = (query) => aiLogService.getStats(query);

/**
 * Xem thông tin hạn mức của khách (X-Guest-Id)
 */
export const getGuestQuota = (guestId) => guestQuotaService.getUsage({ guestId });

/**
 * Đặt lại hạn mức của khách về 0 (Admin reset)
 */
export const resetGuestQuota = ({ guestId, adminId }) =>
  guestQuotaAdminService.resetUsage({ guestId, adminUserId: adminId });

/**
 * Yêu cầu AI Microservice dọn dẹp bộ nhớ đệm chatbot
 */
export const clearChatbotCache = async (adminId) => {
  const cleared = await aiService.clearChatbotCache();
  await aiLogService.recordLog({
    modelName: 'admin',
    action: `ADMIN_CLEAR_CHATBOT_CACHE_BY_${adminId}`,
    status: 'SUCCESS',
    errorFeedback: `Quản trị viên ID ${adminId} đã xóa bộ nhớ đệm chatbot. Đã xóa: ${cleared}`,
  });
  return { cleared };
};

/**
 * FE-08: Can thiệp thủ công kết quả AI
 */
export const interveneAiAction = async ({ logId = null, modelName, action, correctionType, feedback }) => {
  if (logId) {
    const id = Number(logId);
    return aiLogService.resolveLog({
      logId: id,
      errorFeedback: `[Đã can thiệp thủ công: ${correctionType}] ${feedback}`,
    });
  }

  return aiLogService.recordLog({
    modelName: modelName || 'deepseek-chat',
    action: action || 'MANUAL_INTERVENTION',
    status: 'RESOLVED_BY_ADMIN',
    errorFeedback: `[Can thiệp: ${correctionType}] ${feedback}`,
  });
};

/**
 * FE-09: Quản lý báo cáo người dùng
 */
export const getReports = async ({ page = 1, limit = 10, status = '' }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where = {};
  if (status) where.status = status;

  const [total, reports] = await Promise.all([
    reportRepository.count({ where }),
    reportRepository.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        reporter: { select: { user_id: true, full_name: true, email: true } },
        post: {
          select: {
            post_id: true,
            post_type: true,
            status: true,
            blog: { select: { title: true } },
            video: { select: { title: true } },
            author: { select: { user_id: true, full_name: true } },
          },
        },
        comment: {
          select: {
            comment_id: true,
            content: true,
            status: true,
            user: { select: { user_id: true, full_name: true } },
          },
        },
      },
    }),
  ]);

  return { reports, total, page: Number(page), limit: Number(limit) };
};

export const updateReportStatus = async ({ reportId, status, resolutionAction = 'NONE' }) => {
  const id = Number(reportId);
  const report = await reportRepository.findById(id, { post: true, comment: true });
  if (!report) throw ApiError.notFound('Không tìm thấy báo cáo');

  const finalStatus = status === 'REJECTED' ? REPORT_STATUS.DISMISSED : status;

  if (resolutionAction === 'HIDE_CONTENT') {
    const now = new Date();
    // ĐÚNG NGHIỆP VỤ:
    // 1. Nếu là báo cáo về BÌNH LUẬN (comment_id có giá trị):
    // -> CHỈ gỡ bỏ bình luận đó, TUYỆT ĐỐI KHÔNG gỡ bỏ bài viết!
    if (report.comment_id) {
      await commentRepository.update(report.comment_id, {
        status: COMMENT_STATUS.DELETED,
        deleted_at: now,
      });
    } else if (report.post_id) {
      // 2. Chỉ khi là báo cáo về BÀI VIẾT (comment_id là null):
      // -> Gỡ bỏ bài viết đó và các bình luận thuộc bài viết đó
      await prisma.$transaction(async (tx) => {
        await commentRepository.updateMany(
          { post_id: report.post_id },
          { status: COMMENT_STATUS.DELETED, deleted_at: now },
          tx
        );
        await postRepository.updatePost(
          report.post_id,
          { status: POST_STATUS.DELETED, deleted_at: now },
          null,
          tx
        );
      });
    }
  }

  if (report.reporter_id) {
    const statusText =
      finalStatus === REPORT_STATUS.RESOLVED
        ? 'Đã xử lý'
        : finalStatus === REPORT_STATUS.DISMISSED
          ? 'Đã từ chối'
          : finalStatus;
    notificationService
      .notify({
        user_id: report.reporter_id,
        content: `Báo cáo vi phạm của bạn đã được quản trị viên xử lý (${statusText}).`,
      })
      .catch(() => {});
  }

  return reportRepository.update(
    id,
    { status: finalStatus },
    { reporter: { select: { full_name: true } } }
  );
};

/**
 * FE-10: Dashboard thống kê toàn diện
 */
export const getDashboardStats = async () => {
  const [
    totalUsers,
    activeUsers,
    lockedUsers,
    totalPosts,
    publishedPosts,
    hiddenPosts,
    totalVideos,
    totalComments,
    pendingReports,
    resolvedReports,
    aiMetrics,
    recentReports,
    recentAiLogs,
  ] = await Promise.all([
    userRepository.count(),
    userRepository.count({ where: { status: USER_STATUS.ACTIVE } }),
    userRepository.count({ where: { status: USER_STATUS.LOCKED } }),
    postRepository.countPosts({ where: { post_type: 'BLOG' } }),
    postRepository.countPosts({ where: { status: POST_STATUS.PUBLISHED } }),
    postRepository.countPosts({ where: { status: POST_STATUS.HIDDEN_BY_AI } }),
    postRepository.countPosts({ where: { post_type: 'VIDEO' } }),
    commentRepository.count(),
    reportRepository.count({ where: { status: REPORT_STATUS.PENDING } }),
    reportRepository.count({ where: { status: REPORT_STATUS.RESOLVED } }),
    getAiMetrics(),
    reportRepository.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      include: { reporter: { select: { full_name: true } } },
    }),
    aiLogRepository.findRecent(5),
  ]);

  return {
    members: {
      total: totalUsers,
      active: activeUsers,
      locked: lockedUsers,
    },
    content: {
      blogs: totalPosts,
      videos: totalVideos,
      published: publishedPosts,
      hiddenByAi: hiddenPosts,
      comments: totalComments,
    },
    reports: {
      pending: pendingReports,
      resolved: resolvedReports,
      recent: recentReports,
    },
    ai: {
      ...aiMetrics,
      recentLogs: recentAiLogs,
    },
  };
};
