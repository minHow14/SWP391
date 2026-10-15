// d:\Projects\FPT\SWP391\server\src\services\admin.service.js
import prisma from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { USER_STATUS, POST_STATUS, COMMENT_STATUS, REPORT_STATUS } from '../constants/status.js';

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
    prisma.user.count({ where }),
    prisma.user.findMany({
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
  const user = await prisma.user.findUnique({
    where: { user_id: targetId },
    select: { user_id: true, full_name: true, email: true, status: true },
  });
  if (!user) throw ApiError.notFound('Không tìm thấy thành viên');

  const [posts, comments] = await Promise.all([
    prisma.post.findMany({
      where: { author_id: targetId },
      orderBy: { created_at: 'desc' },
      include: {
        blog: true,
        video: true,
        post_categories: { include: { category: true } },
      },
    }),
    prisma.comment.findMany({
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

  const user = await prisma.user.findUnique({ where: { user_id: id } });
  if (!user) throw ApiError.notFound('Không tìm thấy người dùng');

  return prisma.user.update({
    where: { user_id: id },
    data: { status },
    select: { user_id: true, email: true, full_name: true, status: true, role: true },
  });
};

export const deleteUser = async ({ targetUserId, currentAdminId }) => {
  const id = Number(targetUserId);
  if (id === currentAdminId) {
    throw ApiError.badRequest('Không thể tự xóa tài khoản của chính mình');
  }

  const user = await prisma.user.findUnique({ where: { user_id: id } });
  if (!user) throw ApiError.notFound('Không tìm thấy người dùng');

  return prisma.$transaction(async (tx) => {
    await tx.comment.updateMany({
      where: { user_id: id },
      data: { status: COMMENT_STATUS.DELETED },
    });
    await tx.post.updateMany({
      where: { author_id: id },
      data: { status: POST_STATUS.DELETED },
    });
    return tx.user.update({
      where: { user_id: id },
      data: { status: USER_STATUS.DELETED },
      select: { user_id: true, email: true, full_name: true, status: true },
    });
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
    prisma.post.count({ where }),
    prisma.post.findMany({
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
  const post = await prisma.post.findUnique({ where: { post_id: id } });
  if (!post) throw ApiError.notFound('Không tìm thấy bài viết hoặc video');

  return prisma.post.update({
    where: { post_id: id },
    data: { status },
    include: { blog: true, video: true },
  });
};

export const updatePost = async ({ postId, title, content }) => {
  const id = Number(postId);
  const post = await prisma.post.findUnique({
    where: { post_id: id },
    include: { blog: true, video: true },
  });
  if (!post) throw ApiError.notFound('Không tìm thấy bài đăng');

  if (post.post_type === 'BLOG' && post.blog) {
    await prisma.blog.update({
      where: { post_id: id },
      data: {
        title: title || post.blog.title,
        content: content || post.blog.content,
      },
    });
  } else if (post.post_type === 'VIDEO' && post.video) {
    await prisma.video.update({
      where: { post_id: id },
      data: {
        title: title || post.video.title,
        transcript: content !== undefined ? content : post.video.transcript,
      },
    });
  }

  return prisma.post.findUnique({
    where: { post_id: id },
    include: { blog: true, video: true, author: { select: { full_name: true } } },
  });
};

export const deletePost = async (postId) => {
  const id = Number(postId);
  const post = await prisma.post.findUnique({ where: { post_id: id } });
  if (!post) throw ApiError.notFound('Không tìm thấy bài đăng');

  return prisma.$transaction(async (tx) => {
    await tx.comment.updateMany({
      where: { post_id: id },
      data: { status: COMMENT_STATUS.DELETED },
    });
    return tx.post.update({
      where: { post_id: id },
      data: { status: POST_STATUS.DELETED },
    });
  });
};

/**
 * FE-03: Quản lý bình luận
 */
export const getComments = async ({ page = 1, limit = 10, status = '', isFlagged = null, search = '' }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where = {};
  if (status) where.status = status;
  if (isFlagged !== null && isFlagged !== undefined && isFlagged !== '') {
    where.is_flagged_by_ai = isFlagged === 'true' || isFlagged === true;
  }
  if (search) {
    where.content = { contains: search, mode: 'insensitive' };
  }

  const [total, comments] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
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
  const comment = await prisma.comment.findUnique({ where: { comment_id: id } });
  if (!comment) throw ApiError.notFound('Không tìm thấy bình luận');

  return prisma.comment.update({
    where: { comment_id: id },
    data: { status },
    include: { user: { select: { full_name: true } } },
  });
};

export const deleteComment = async (commentId) => {
  const id = Number(commentId);
  const comment = await prisma.comment.findUnique({ where: { comment_id: id } });
  if (!comment) throw ApiError.notFound('Không tìm thấy bình luận');

  return prisma.comment.update({
    where: { comment_id: id },
    data: { status: COMMENT_STATUS.DELETED },
  });
};

/**
 * FE-04: Quản lý danh mục
 */
export const getCategories = async () => {
  return prisma.category.findMany({
    orderBy: { category_id: 'asc' },
    include: {
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

  const existing = await prisma.category.findUnique({ where: { name: trimmed } });
  if (existing) throw ApiError.conflict('Tên danh mục đã tồn tại');

  return prisma.category.create({ data: { name: trimmed } });
};

export const updateCategory = async ({ categoryId, name }) => {
  const id = Number(categoryId);
  const trimmed = name?.trim();
  if (!trimmed) throw ApiError.badRequest('Tên danh mục không được để trống');

  const category = await prisma.category.findUnique({ where: { category_id: id } });
  if (!category) throw ApiError.notFound('Không tìm thấy danh mục');

  const existing = await prisma.category.findFirst({
    where: { name: trimmed, category_id: { not: id } },
  });
  if (existing) throw ApiError.conflict('Tên danh mục đã được sử dụng');

  return prisma.category.update({
    where: { category_id: id },
    data: { name: trimmed },
  });
};

export const deleteCategory = async (categoryId) => {
  const id = Number(categoryId);
  const category = await prisma.category.findUnique({
    where: { category_id: id },
    include: {
      _count: { select: { post_categories: true, recipes: true } },
    },
  });
  if (!category) throw ApiError.notFound('Không tìm thấy danh mục');

  if (category._count.post_categories > 0 || category._count.recipes > 0) {
    throw ApiError.badRequest('Không thể xóa danh mục đang có bài viết hoặc công thức nấu ăn liên kết');
  }

  return prisma.category.delete({ where: { category_id: id } });
};

/**
 * FE-05: Kiểm duyệt nội dung gắn cờ tự động bởi AI
 */
export const getAiFlaggedContent = async () => {
  const [flaggedPosts, flaggedComments] = await Promise.all([
    prisma.post.findMany({
      where: { status: POST_STATUS.HIDDEN_BY_AI },
      orderBy: { created_at: 'desc' },
      include: {
        author: { select: { user_id: true, full_name: true, email: true } },
        blog: true,
        video: true,
      },
    }),
    prisma.comment.findMany({
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

  if (type === 'POST') {
    const post = await prisma.post.findUnique({ where: { post_id: id } });
    if (!post) throw ApiError.notFound('Không tìm thấy bài viết');

    const newStatus = action === 'APPROVE' ? POST_STATUS.PUBLISHED : POST_STATUS.DELETED;
    const updated = await prisma.$transaction(async (tx) => {
      if (action !== 'APPROVE') {
        await tx.comment.updateMany({
          where: { post_id: id },
          data: { status: COMMENT_STATUS.DELETED },
        });
      }
      return tx.post.update({ where: { post_id: id }, data: { status: newStatus } });
    });

    await prisma.ai_logs.create({
      data: {
        model_name: 'deepseek-chat',
        action: 'MODERATION_MANUAL_OVERRIDE',
        status: 'SUCCESS',
        error_feedback: `Admin duyệt thủ công bài viết ID ${id}: ${action}. Ghi chú: ${notes || 'Không có'}`,
      },
    });
    return updated;
  }

  if (type === 'COMMENT') {
    const comment = await prisma.comment.findUnique({ where: { comment_id: id } });
    if (!comment) throw ApiError.notFound('Không tìm thấy bình luận');

    const newStatus = action === 'APPROVE' ? COMMENT_STATUS.ACTIVE : COMMENT_STATUS.DELETED;
    const updated = await prisma.comment.update({
      where: { comment_id: id },
      data: { status: newStatus, is_flagged_by_ai: action === 'APPROVE' ? false : comment.is_flagged_by_ai },
    });

    await prisma.ai_logs.create({
      data: {
        model_name: 'deepseek-chat',
        action: 'MODERATION_MANUAL_OVERRIDE',
        status: 'SUCCESS',
        error_feedback: `Admin duyệt thủ công bình luận ID ${id}: ${action}. Ghi chú: ${notes || 'Không có'}`,
      },
    });
    return updated;
  }

  throw ApiError.badRequest('Loại đối tượng không hợp lệ (hỗ trợ POST hoặc COMMENT)');
};

/**
 * FE-06 & FE-07: Giám sát mô hình AI, xem logs & metrics
 */
export const getAiModelsStatus = async () => {
  const logs = await prisma.ai_logs.findMany({
    orderBy: { created_at: 'desc' },
    take: 100,
  });

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
      actions: ['CHATBOT_GUEST_QUERY'],
    },
    {
      id: 'moderation',
      name: 'Content Moderation',
      type: 'Kiểm duyệt spam & nội dung độc hại',
      provider: 'DeepSeek Filter',
      actions: ['SPAM_DETECTION', 'MODERATION_MANUAL_OVERRIDE'],
    },
  ];

  return models.map((m) => {
    const modelLogs = logs.filter((l) => m.actions.includes(l.action));
    const totalCalls = modelLogs.length;
    const errorCalls = modelLogs.filter((l) => l.status === 'ERROR').length;
    const successRate = totalCalls > 0 ? Math.round(((totalCalls - errorCalls) / totalCalls) * 100) : 100;
    const lastActive = modelLogs[0]?.created_at || null;

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

export const getAiLogs = async ({ page = 1, limit = 10, modelName = '', action = '', status = '' }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where = {};
  if (modelName) where.model_name = { contains: modelName, mode: 'insensitive' };
  if (action) where.action = action;
  if (status) where.status = status;

  const [total, logs] = await Promise.all([
    prisma.ai_logs.count({ where }),
    prisma.ai_logs.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return { logs, total, page: Number(page), limit: Number(limit) };
};

export const getAiMetrics = async () => {
  const [total, successCount, errorCount, flaggedCount] = await Promise.all([
    prisma.ai_logs.count(),
    prisma.ai_logs.count({ where: { status: 'SUCCESS' } }),
    prisma.ai_logs.count({ where: { status: 'ERROR' } }),
    prisma.post.count({ where: { status: POST_STATUS.HIDDEN_BY_AI } }),
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
 * FE-08: Can thiệp thủ công kết quả AI
 */
export const interveneAiAction = async ({ logId = null, modelName, action, correctionType, feedback }) => {
  if (logId) {
    const id = Number(logId);
    return prisma.ai_logs.update({
      where: { log_id: id },
      data: {
        error_feedback: `[Đã can thiệp thủ công: ${correctionType}] ${feedback}`,
        status: 'RESOLVED_BY_ADMIN',
      },
    });
  }

  return prisma.ai_logs.create({
    data: {
      model_name: modelName || 'deepseek-chat',
      action: action || 'MANUAL_INTERVENTION',
      status: 'RESOLVED_BY_ADMIN',
      error_feedback: `[Can thiệp: ${correctionType}] ${feedback}`,
    },
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
    prisma.report.count({ where }),
    prisma.report.findMany({
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
  const report = await prisma.report.findUnique({
    where: { report_id: id },
    include: { post: true, comment: true },
  });
  if (!report) throw ApiError.notFound('Không tìm thấy báo cáo');

  if (resolutionAction === 'HIDE_CONTENT') {
    if (report.post_id) {
      await prisma.$transaction([
        prisma.comment.updateMany({ where: { post_id: report.post_id }, data: { status: COMMENT_STATUS.DELETED } }),
        prisma.post.update({ where: { post_id: report.post_id }, data: { status: POST_STATUS.DELETED } }),
      ]);
    }
    if (report.comment_id) {
      await prisma.comment.update({ where: { comment_id: report.comment_id }, data: { status: COMMENT_STATUS.DELETED } });
    }
  }

  return prisma.report.update({
    where: { report_id: id },
    data: { status },
    include: { reporter: { select: { full_name: true } } },
  });
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
    prisma.user.count(),
    prisma.user.count({ where: { status: USER_STATUS.ACTIVE } }),
    prisma.user.count({ where: { status: USER_STATUS.LOCKED } }),
    prisma.post.count({ where: { post_type: 'BLOG' } }),
    prisma.post.count({ where: { status: POST_STATUS.PUBLISHED } }),
    prisma.post.count({ where: { status: POST_STATUS.HIDDEN_BY_AI } }),
    prisma.post.count({ where: { post_type: 'VIDEO' } }),
    prisma.comment.count(),
    prisma.report.count({ where: { status: REPORT_STATUS.PENDING } }),
    prisma.report.count({ where: { status: REPORT_STATUS.RESOLVED } }),
    getAiMetrics(),
    prisma.report.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      include: { reporter: { select: { full_name: true } } },
    }),
    prisma.ai_logs.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
    }),
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
