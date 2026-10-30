// D:/SWP391/SWP391/server/src/services/video.service.js
import prisma from '../config/prisma.js';
import { POST_TYPE, POST_STATUS, COMMENT_STATUS } from '../constants/index.js';
import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/index.js';
import { postRepository } from '../repositories/post.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { categoryRepository } from '../repositories/category.repository.js';
import { notificationService } from './notification.service.js';

export const videoService = {
  /**
   * Tạo video mới sử dụng Transaction
   * author_id lấy từ người dùng đã xác thực
   */
  async createVideo({
    author_id,
    title,
    video_url,
    thumbnail_url,
    duration,
    transcript,
    categoryId,
    category_id,
  }) {
    const numericAuthorId = Number(author_id);
    if (!numericAuthorId || !title?.trim() || !video_url?.trim()) {
      throw ApiError.badRequest('author_id, title, and video_url are required');
    }

    const author = await userRepository.findById(numericAuthorId);
    if (!author) {
      throw ApiError.notFound('Author user not found');
    }

    const rawCategoryId = categoryId !== undefined ? categoryId : category_id;
    const numericCategoryId = rawCategoryId ? Number(rawCategoryId) : null;
    if (numericCategoryId) {
      const categoryExists = await categoryRepository.findById(numericCategoryId);
      if (!categoryExists) {
        throw ApiError.badRequest('Chuyên mục bài viết không tồn tại');
      }
    }

    return await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: {
          author_id: numericAuthorId,
          post_type: POST_TYPE.VIDEO,
          status: POST_STATUS.PUBLISHED,
        },
      });

      const newVideo = await tx.video.create({
        data: {
          post_id: newPost.post_id,
          title: title.trim(),
          video_url: video_url.trim(),
          thumbnail_url: thumbnail_url?.trim() || '',
          duration: duration ? Number(duration) : 0,
          transcript: transcript || '',
        },
      });

      let categoryInfo = null;
      if (numericCategoryId) {
        await tx.postCategory.create({
          data: {
            post_id: newPost.post_id,
            category_id: numericCategoryId,
          },
        });
        categoryInfo = await tx.category.findUnique({
          where: { category_id: numericCategoryId },
        });
      }

      return {
        ...newPost,
        ...newVideo,
        category_id: numericCategoryId,
        categoryId: numericCategoryId,
        category: categoryInfo,
        author: {
          user_id: author.user_id,
          full_name: author.full_name,
          email: author.email,
        },
      };
    });
  },

  /**
   * Lấy danh sách tất cả video đang hoạt động, hỗ trợ phân trang và lọc
   */
  async getAllVideos(query = {}) {
    const where = {
      post: {
        status: POST_STATUS.PUBLISHED,
      },
    };

    if (query.categoryId || query.category_id) {
      const catId = Number(query.categoryId || query.category_id);
      where.post.post_categories = {
        some: {
          category_id: catId,
        },
      };
    }

    if (query.search) {
      const searchStr = String(query.search).trim();
      where.OR = [
        { title: { contains: searchStr, mode: 'insensitive' } },
        { transcript: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    const hasPagination = query.page !== undefined || query.limit !== undefined;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const include = {
      post: {
        include: {
          author: {
            select: {
              user_id: true,
              full_name: true,
            },
          },
          post_categories: {
            include: {
              category: true,
            },
          },
        },
      },
    };

    const orderBy = {
      post: {
        created_at: 'desc',
      },
    };

    const formatVideo = (v) => {
      const firstCat = v.post?.post_categories?.[0];
      return {
        ...v.post,
        ...v,
        category_id: firstCat?.category_id || null,
        categoryId: firstCat?.category_id || null,
        category: firstCat?.category || null,
        post: undefined,
      };
    };

    if (hasPagination) {
      const [total, videos] = await Promise.all([
        prisma.video.count({ where }),
        postRepository.findAllVideos({
          where,
          include,
          orderBy,
          skip,
          take: limit,
        }),
      ]);

      return {
        videos: videos.map(formatVideo),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    const videos = await postRepository.findAllVideos({
      where,
      include,
      orderBy,
    });

    return videos.map(formatVideo);
  },

  /**
   * Lấy chi tiết một video theo ID
   */
  async getVideoById(id) {
    const postId = Number(id);
    if (isNaN(postId)) {
      throw ApiError.badRequest('Invalid video ID format');
    }

    const video = await postRepository.findVideoById(
      postId,
      {
        post: {
          include: {
            author: {
              select: {
                user_id: true,
                full_name: true,
              },
            },
            post_categories: {
              include: {
                category: true,
              },
            },
          },
        },
      }
    );

    if (!video || !video.post || video.post.status === POST_STATUS.DELETED) {
      throw ApiError.notFound('Video not found');
    }

    const { post, ...videoData } = video;
    const firstCat = post?.post_categories?.[0];
    return {
      ...post,
      ...videoData,
      category_id: firstCat?.category_id || null,
      categoryId: firstCat?.category_id || null,
      category: firstCat?.category || null,
    };
  },

  /**
   * Cập nhật thông tin video có kiểm tra quyền sở hữu (Ownership Protection)
   */
  async updateVideo(
    id,
    { title, video_url, thumbnail_url, duration, transcript, categoryId, category_id },
    currentUser
  ) {
    const postId = Number(id);
    if (isNaN(postId)) {
      throw ApiError.badRequest('Invalid video ID format');
    }

    const existingVideo = await postRepository.findVideoById(
      postId,
      {
        post: true,
      }
    );

    if (!existingVideo || existingVideo.post.status === POST_STATUS.DELETED) {
      throw ApiError.notFound('Video not found or has been deleted');
    }

    // KIỂM TRA QUYỀN SỞ HỮU HOẶC ADMIN
    if (currentUser) {
      const isOwner = existingVideo.post.author_id === currentUser.user_id;
      const isAdmin = currentUser.role === ROLES.ADMIN;
      if (!isOwner && !isAdmin) {
        throw ApiError.forbidden('Chỉ tác giả hoặc Quản trị viên mới có quyền cập nhật video này');
      }
    }

    const rawCat = categoryId !== undefined ? categoryId : category_id;
    let numericCategoryId = undefined;
    if (rawCat !== undefined) {
      numericCategoryId = rawCat ? Number(rawCat) : null;
      if (numericCategoryId) {
        const categoryExists = await categoryRepository.findById(numericCategoryId);
        if (!categoryExists) {
          throw ApiError.badRequest('Chuyên mục bài viết không tồn tại');
        }
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (video_url !== undefined) updateData.video_url = video_url.trim();
    if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url?.trim() || null;
    if (duration !== undefined) updateData.duration = Number(duration);
    if (transcript !== undefined) updateData.transcript = transcript;

    return await prisma.$transaction(async (tx) => {
      const updatedVideo = await tx.video.update({
        where: { post_id: postId },
        data: updateData,
        include: {
          post: {
            include: {
              author: {
                select: {
                  user_id: true,
                  full_name: true,
                },
              },
            },
          },
        },
      });

      if (numericCategoryId !== undefined) {
        await tx.postCategory.deleteMany({ where: { post_id: postId } });
        if (numericCategoryId) {
          await tx.postCategory.create({
            data: { post_id: postId, category_id: numericCategoryId },
          });
        }
      }

      const postCat = await tx.postCategory.findFirst({
        where: { post_id: postId },
        include: { category: true },
      });

      const { post, ...videoData } = updatedVideo;
      return {
        ...post,
        ...videoData,
        category_id: postCat?.category_id || null,
        categoryId: postCat?.category_id || null,
        category: postCat?.category || null,
      };
    });
  },

  /**
   * Xóa mềm (Soft Delete) video có kiểm tra quyền sở hữu (Ownership Protection)
   */
  async deleteVideo(id, currentUser) {
    const postId = Number(id);
    if (isNaN(postId)) {
      throw ApiError.badRequest('Invalid video ID format');
    }

    const post = await postRepository.findPostById(postId);

    if (!post || post.post_type !== POST_TYPE.VIDEO) {
      throw ApiError.notFound('Video post not found');
    }

    // KIỂM TRA QUYỀN SỞ HỮU HOẶC ADMIN
    if (currentUser) {
      const isOwner = post.author_id === currentUser.user_id;
      const isAdmin = currentUser.role === ROLES.ADMIN;
      if (!isOwner && !isAdmin) {
        throw ApiError.forbidden('Chỉ tác giả hoặc Quản trị viên mới có quyền xóa video này');
      }
    }

    if (post.status === POST_STATUS.DELETED) {
      return { message: 'Video is already deleted' };
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.comment.updateMany({
        where: { post_id: postId, status: { not: COMMENT_STATUS.DELETED } },
        data: { status: COMMENT_STATUS.DELETED, deleted_at: now },
      });
      await tx.post.update({
        where: { post_id: postId },
        data: {
          status: POST_STATUS.DELETED,
          deleted_at: now,
        },
      });
      if (currentUser?.role === ROLES.ADMIN && currentUser.user_id !== post.author_id) {
        await notificationService.notifyPostRemoval({ userId: post.author_id, postId }, tx);
      }
    });

    return { message: 'Video deleted successfully' };
  },
};
