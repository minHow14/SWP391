import prisma from '../config/prisma.js';
import { POST_TYPE, POST_STATUS } from '../constants/index.js';
import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/index.js';

export const videoService = {
  /**
   * Tạo video mới sử dụng Transaction
   * author_id lấy từ người dùng đã xác thực
   */
  async createVideo({ author_id, title, video_url, thumbnail_url, duration, transcript }) {
    const numericAuthorId = Number(author_id);
    if (!numericAuthorId || !title?.trim() || !video_url?.trim()) {
      throw ApiError.badRequest('author_id, title, and video_url are required');
    }

    const author = await prisma.user.findUnique({
      where: { user_id: numericAuthorId },
    });
    if (!author) {
      throw ApiError.notFound('Author user not found');
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

      return {
        ...newPost,
        ...newVideo,
        author: {
          user_id: author.user_id,
          full_name: author.full_name,
          email: author.email,
        },
      };
    });
  },

  /**
   * Lấy danh sách tất cả video đang hoạt động
   */
  async getAllVideos() {
    const videos = await prisma.video.findMany({
      where: {
        post: {
          status: { not: POST_STATUS.DELETED },
        },
      },
      include: {
        post: {
          include: {
            author: {
              select: {
                user_id: true,
                full_name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        post: {
          created_at: 'desc',
        },
      },
    });

    return videos.map((v) => ({
      ...v.post,
      ...v,
      post: undefined,
    }));
  },

  /**
   * Lấy chi tiết một video theo ID
   */
  async getVideoById(id) {
    const postId = Number(id);
    if (isNaN(postId)) {
      throw ApiError.badRequest('Invalid video ID format');
    }

    const video = await prisma.video.findFirst({
      where: {
        post_id: postId,
        post: {
          status: { not: POST_STATUS.DELETED },
        },
      },
      include: {
        post: {
          include: {
            author: {
              select: {
                user_id: true,
                full_name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!video || !video.post) {
      throw ApiError.notFound('Video not found');
    }

    const { post, ...videoData } = video;
    return {
      ...post,
      ...videoData,
    };
  },

  /**
   * Cập nhật thông tin video có kiểm tra quyền sở hữu (Ownership Protection)
   */
  async updateVideo(id, { title, video_url, thumbnail_url, duration, transcript }, currentUser) {
    const postId = Number(id);
    if (isNaN(postId)) {
      throw ApiError.badRequest('Invalid video ID format');
    }

    const existingVideo = await prisma.video.findFirst({
      where: {
        post_id: postId,
        post: {
          status: { not: POST_STATUS.DELETED },
        },
      },
      include: {
        post: true,
      },
    });

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

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (video_url !== undefined) updateData.video_url = video_url.trim();
    if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url.trim();
    if (duration !== undefined) updateData.duration = Number(duration);
    if (transcript !== undefined) updateData.transcript = transcript;

    const updatedVideo = await prisma.video.update({
      where: { post_id: postId },
      data: updateData,
      include: {
        post: {
          include: {
            author: {
              select: {
                user_id: true,
                full_name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const { post, ...videoData } = updatedVideo;
    return {
      ...post,
      ...videoData,
    };
  },

  /**
   * Xóa mềm (Soft Delete) video có kiểm tra quyền sở hữu (Ownership Protection)
   */
  async deleteVideo(id, currentUser) {
    const postId = Number(id);
    if (isNaN(postId)) {
      throw ApiError.badRequest('Invalid video ID format');
    }

    const post = await prisma.post.findUnique({
      where: { post_id: postId },
    });

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

    await prisma.post.update({
      where: { post_id: postId },
      data: { status: POST_STATUS.DELETED },
    });

    return { message: 'Video deleted successfully' };
  },
};
