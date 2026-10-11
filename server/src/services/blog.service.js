import prisma from '../config/prisma.js';
import { POST_TYPE, POST_STATUS } from '../constants/index.js';
import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/index.js';

export const blogService = {
  /**
   * Tạo bài viết Blog mới sử dụng Transaction để đảm bảo tính nguyên tử
   * author_id được lấy trực tiếp từ người dùng đã xác thực
   */
  async createBlog({ author_id, title, content, attached_video_id }) {
    const numericAuthorId = Number(author_id);
    if (!numericAuthorId || !title?.trim() || !content?.trim()) {
      throw ApiError.badRequest('author_id, title, and content are required');
    }

    const author = await prisma.user.findUnique({
      where: { user_id: numericAuthorId },
    });
    if (!author) {
      throw ApiError.notFound('Author user not found');
    }

    const numericVideoId = attached_video_id ? Number(attached_video_id) : null;
    if (numericVideoId) {
      const videoExists = await prisma.video.findUnique({
        where: { post_id: numericVideoId },
      });
      if (!videoExists) {
        throw ApiError.badRequest('Attached video does not exist');
      }
    }

    return await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: {
          author_id: numericAuthorId,
          post_type: POST_TYPE.BLOG,
          status: POST_STATUS.PUBLISHED,
        },
      });

      const newBlog = await tx.blog.create({
        data: {
          post_id: newPost.post_id,
          title: title.trim(),
          content: content.trim(),
          attached_video_id: numericVideoId,
        },
        include: {
          attached_video: true,
        },
      });

      return {
        ...newPost,
        ...newBlog,
        author: {
          user_id: author.user_id,
          full_name: author.full_name,
          email: author.email,
        },
      };
    });
  },

  /**
   * Lấy danh sách tất cả Blog còn hoạt động (không bị xóa mềm)
   */
  async getAllBlogs() {
    const blogs = await prisma.blog.findMany({
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
              },
            },
          },
        },
        attached_video: true,
      },
      orderBy: {
        post: {
          created_at: 'desc',
        },
      },
    });

    return blogs.map((b) => ({
      ...b.post,
      ...b,
      post: undefined,
    }));
  },

  /**
   * Lấy chi tiết một Blog theo ID
   */
  async getBlogById(id) {
    const postId = Number(id);
    if (isNaN(postId)) {
      throw ApiError.badRequest('Invalid blog ID format');
    }

    const blog = await prisma.blog.findFirst({
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
              },
            },
          },
        },
        attached_video: true,
      },
    });

    if (!blog || !blog.post) {
      throw ApiError.notFound('Blog post not found');
    }

    const { post, ...blogData } = blog;
    return {
      ...post,
      ...blogData,
    };
  },

  /**
   * Cập nhật bài viết Blog có kiểm tra quyền sở hữu (Ownership Protection)
   */
  async updateBlog(id, { title, content, attached_video_id }, currentUser) {
    const postId = Number(id);
    if (isNaN(postId)) {
      throw ApiError.badRequest('Invalid blog ID format');
    }

    const existingBlog = await prisma.blog.findFirst({
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

    if (!existingBlog || existingBlog.post.status === POST_STATUS.DELETED) {
      throw ApiError.notFound('Blog not found or has been deleted');
    }

    // KIỂM TRA QUYỀN SỞ HỮU HOẶC QUYỀN ADMIN (CHỐNG IDOR / BOLA)
    if (currentUser) {
      const isOwner = existingBlog.post.author_id === currentUser.user_id;
      const isAdmin = currentUser.role === ROLES.ADMIN;
      if (!isOwner && !isAdmin) {
        throw ApiError.forbidden('Chỉ tác giả hoặc Quản trị viên mới có quyền cập nhật bài viết này');
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();

    if (attached_video_id !== undefined) {
      const numericVideoId = attached_video_id ? Number(attached_video_id) : null;
      if (numericVideoId) {
        const videoExists = await prisma.video.findUnique({
          where: { post_id: numericVideoId },
        });
        if (!videoExists) {
          throw ApiError.badRequest('Attached video does not exist');
        }
      }
      updateData.attached_video_id = numericVideoId;
    }

    const updatedBlog = await prisma.blog.update({
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
        attached_video: true,
      },
    });

    const { post, ...blogData } = updatedBlog;
    return {
      ...post,
      ...blogData,
    };
  },

  /**
   * Xóa mềm (Soft Delete) bài viết Blog có kiểm tra quyền sở hữu (Ownership Protection)
   */
  async deleteBlog(id, currentUser) {
    const postId = Number(id);
    if (isNaN(postId)) {
      throw ApiError.badRequest('Invalid blog ID format');
    }

    const post = await prisma.post.findUnique({
      where: { post_id: postId },
    });

    if (!post || post.post_type !== POST_TYPE.BLOG) {
      throw ApiError.notFound('Blog post not found');
    }

    // KIỂM TRA QUYỀN SỞ HỮU HOẶC QUYỀN ADMIN
    if (currentUser) {
      const isOwner = post.author_id === currentUser.user_id;
      const isAdmin = currentUser.role === ROLES.ADMIN;
      if (!isOwner && !isAdmin) {
        throw ApiError.forbidden('Chỉ tác giả hoặc Quản trị viên mới có quyền xóa bài viết này');
      }
    }

    if (post.status === POST_STATUS.DELETED) {
      return { message: 'Blog is already deleted' };
    }

    await prisma.post.update({
      where: { post_id: postId },
      data: { status: POST_STATUS.DELETED },
    });

    return { message: 'Blog deleted successfully' };
  },
};
