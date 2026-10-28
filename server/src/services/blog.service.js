// D:/SWP391/SWP391/server/src/services/blog.service.js
import prisma from '../config/prisma.js';
import { postRepository } from '../repositories/post.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { POST_TYPE, POST_STATUS, COMMENT_STATUS } from '../constants/index.js';
import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/index.js';
import { contentModerationService } from './contentModerationService.js';

export const blogService = {
  /**
   * Tạo bài viết Blog mới sử dụng Transaction để đảm bảo tính nguyên tử
   * author_id được lấy trực tiếp từ người dùng đã xác thực
   */
  async createBlog({
    author_id,
    authorId,
    title,
    content,
    categoryId,
    category_id,
    attachedVideoId,
    attached_video_id,
    attachments = [],
  }) {
    const rawAuthorId = author_id || authorId;
    const numericAuthorId = Number(rawAuthorId);
    if (!numericAuthorId || !title?.trim() || !content?.trim()) {
      throw ApiError.badRequest('author_id, title, and content are required');
    }

    const author = await userRepository.findById(numericAuthorId);
    if (!author) {
      throw ApiError.notFound('Author user not found');
    }

    const rawVideoId = attachedVideoId !== undefined ? attachedVideoId : attached_video_id;
    const numericVideoId = rawVideoId ? Number(rawVideoId) : null;
    if (numericVideoId) {
      const videoExists = await postRepository.findVideoById(numericVideoId);
      if (!videoExists) {
        throw ApiError.badRequest('Attached video does not exist');
      }
    }

    const rawCategoryId = categoryId !== undefined ? categoryId : category_id;
    const numericCategoryId = rawCategoryId ? Number(rawCategoryId) : null;
    if (numericCategoryId) {
      const categoryExists = await postRepository.findCategoryById(numericCategoryId);
      if (!categoryExists) {
        throw ApiError.badRequest('Chuyên mục bài viết không tồn tại');
      }
    }

    return await prisma.$transaction(async (tx) => {
      const newPost = await postRepository.createPost(
        {
          author_id: numericAuthorId,
          post_type: POST_TYPE.BLOG,
          status: POST_STATUS.PUBLISHED,
        },
        tx
      );

      const newBlog = await postRepository.createBlog(
        {
          post_id: newPost.post_id,
          title: title.trim(),
          content: content.trim(),
          attached_video_id: numericVideoId,
        },
        {
          attached_video: true,
        },
        tx
      );

      let categoryInfo = null;
      if (numericCategoryId) {
        const link = await postRepository.setPostCategory(newPost.post_id, numericCategoryId, tx);
        if (link) {
          categoryInfo = await postRepository.findCategoryById(numericCategoryId, tx);
        }
      }

      let savedAttachments = [];
      if (Array.isArray(attachments) && attachments.length > 0) {
        savedAttachments = await postRepository.setPostAttachments(newPost.post_id, attachments, tx);
      }

      const formattedAttachments = savedAttachments.map((a) => ({
        id: a.attachment_id,
        url: a.file_url,
        type: a.file_type,
        name: a.file_name,
      }));

      const moderation = await contentModerationService.queuePost({ post: newPost, title: newBlog.title, content: newBlog.content }, tx);

      return {
        ...newPost,
        ...newBlog,
        ...moderation,
        category_id: numericCategoryId,
        categoryId: numericCategoryId,
        category: categoryInfo,
        attachments: formattedAttachments,
        author: {
          user_id: author.user_id,
          full_name: author.full_name,
          email: author.email,
        },
      };
    });
  },

  /**
   * Lấy danh sách tất cả Blog còn hoạt động (không bị xóa mềm), hỗ trợ phân trang và lọc
   */
  async getAllBlogs(query = {}) {
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
        { content: { contains: searchStr, mode: 'insensitive' } },
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
          attachments: {
            orderBy: {
              attachment_id: 'asc',
            },
          },
        },
      },
      attached_video: true,
    };

    const orderBy = {
      post: {
        created_at: 'desc',
      },
    };

    const formatBlog = (b) => {
      const { post, ...blogData } = b;
      const firstCat = post?.post_categories?.[0];
      const attachments = (post?.attachments || []).map((a) => ({
        id: a.attachment_id,
        url: a.file_url,
        type: a.file_type,
        name: a.file_name,
      }));

      return {
        ...post,
        ...blogData,
        category_id: firstCat?.category_id || null,
        categoryId: firstCat?.category_id || null,
        category: firstCat?.category || null,
        attachments,
      };
    };

    if (hasPagination) {
      const [total, blogs] = await Promise.all([
        prisma.blog.count({ where }),
        postRepository.findAllBlogs({
          where,
          include,
          orderBy,
          skip,
          take: limit,
        }),
      ]);

      return {
        blogs: blogs.map(formatBlog),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    const blogs = await postRepository.findAllBlogs({
      where,
      include,
      orderBy,
    });

    return blogs.map(formatBlog);
  },

  /**
   * Lấy chi tiết một Blog theo ID
   */
  async getBlogById(id, currentUser) {
    const postId = Number(id);
    if (isNaN(postId)) {
      throw ApiError.badRequest('Invalid blog ID format');
    }

    const blog = await postRepository.findBlogById(postId, {
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
          attachments: {
            orderBy: {
              attachment_id: 'asc',
            },
          },
        },
      },
      attached_video: true,
    });

    if (!blog || !blog.post || blog.post.status === POST_STATUS.DELETED) {
      throw ApiError.notFound('Blog post not found');
    }

    const canPreview = currentUser && (currentUser.role === ROLES.ADMIN || currentUser.user_id === blog.post.author_id);
    if (blog.post.status !== POST_STATUS.PUBLISHED && !canPreview) throw ApiError.notFound('Blog post not found');

    const { post, ...blogData } = blog;
    const firstCat = post?.post_categories?.[0];
    const attachments = (post?.attachments || []).map((a) => ({
      id: a.attachment_id,
      url: a.file_url,
      type: a.file_type,
      name: a.file_name,
    }));

    return {
      ...post,
      ...blogData,
      category_id: firstCat?.category_id || null,
      categoryId: firstCat?.category_id || null,
      category: firstCat?.category || null,
      attachments,
    };
  },

  /**
   * Cập nhật bài viết Blog có kiểm tra quyền sở hữu (Ownership Protection)
   */
  async updateBlog(
    id,
    {
      title,
      content,
      categoryId,
      category_id,
      attachedVideoId,
      attached_video_id,
      attachments,
    },
    currentUser
  ) {
    const postId = Number(id);
    if (isNaN(postId)) {
      throw ApiError.badRequest('Invalid blog ID format');
    }

    const existingBlog = await postRepository.findBlogById(postId, {
      post: true,
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

    const rawVideoId = attachedVideoId !== undefined ? attachedVideoId : attached_video_id;
    if (rawVideoId !== undefined) {
      const numericVideoId = rawVideoId ? Number(rawVideoId) : null;
      if (numericVideoId) {
        const videoExists = await postRepository.findVideoById(numericVideoId);
        if (!videoExists) {
          throw ApiError.badRequest('Attached video does not exist');
        }
      }
      updateData.attached_video_id = numericVideoId;
    }

    const rawCat = categoryId !== undefined ? categoryId : category_id;
    let numericCategoryId = undefined;
    if (rawCat !== undefined) {
      numericCategoryId = rawCat ? Number(rawCat) : null;
      if (numericCategoryId) {
        const categoryExists = await postRepository.findCategoryById(numericCategoryId);
        if (!categoryExists) {
          throw ApiError.badRequest('Chuyên mục bài viết không tồn tại');
        }
      }
    }

    return await prisma.$transaction(async (tx) => {
      // Serialize edits before comparing text so every job contains the version actually saved.
      await postRepository.lockBlog(postId, tx);
      const currentBlog = await postRepository.findBlogById(postId, { post: true }, tx);
      if (!currentBlog || currentBlog.post.status === POST_STATUS.DELETED) throw ApiError.notFound('Blog post not found');
      const textChanged = ['title', 'content'].some((field) => updateData[field] !== undefined && updateData[field] !== currentBlog[field]);
      const updatedBlog = await postRepository.updateBlog(
        postId,
        updateData,
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
              attachments: {
                orderBy: {
                  attachment_id: 'asc',
                },
              },
            },
          },
          attached_video: true,
        },
        tx
      );

      if (numericCategoryId !== undefined) {
        await postRepository.setPostCategory(postId, numericCategoryId, tx);
      }

      let currentAttachments = updatedBlog.post?.attachments || [];
      if (Array.isArray(attachments)) {
        const saved = await postRepository.setPostAttachments(postId, attachments, tx);
        currentAttachments = saved;
      }

      const formattedAttachments = currentAttachments.map((a) => ({
        id: a.attachment_id,
        url: a.file_url,
        type: a.file_type,
        name: a.file_name,
      }));

      const { post, ...blogData } = updatedBlog;
      const moderation = textChanged ? await contentModerationService.queuePost({
        post, title: updatedBlog.title, content: updatedBlog.content,
      }, tx) : {};
      return {
        ...post,
        ...blogData,
        ...moderation,
        category_id:
          numericCategoryId !== undefined
            ? numericCategoryId
            : post?.post_categories?.[0]?.category_id || null,
        categoryId:
          numericCategoryId !== undefined
            ? numericCategoryId
            : post?.post_categories?.[0]?.category_id || null,
        attachments: formattedAttachments,
      };
    });
  },

  /**
   * Xóa hoàn toàn (Hard Delete / Permanent Delete) bài viết Blog
   * Đồng thời thu hồi và dọn dẹp các tệp ảnh/video đính kèm khỏi đĩa
   */
  async deleteBlog(id, currentUser) {
    const postId = Number(id);
    if (isNaN(postId)) {
      throw ApiError.badRequest('Invalid blog ID format');
    }

    const post = await postRepository.findPostById(postId, {
      attachments: true,
    });

    if (!post || (post.post_type !== POST_TYPE.BLOG && post.post_type !== POST_TYPE.VIDEO)) {
      throw ApiError.notFound('Blog post not found');
    }

    // KIỂM TRA QUYỀN SỞ HỮU HOẶC QUYỀN ADMIN (CHỐNG IDOR / BOLA)
    if (currentUser) {
      const isOwner = post.author_id === currentUser.user_id;
      const isAdmin = currentUser.role === ROLES.ADMIN;
      if (!isOwner && !isAdmin) {
        throw ApiError.forbidden('Chỉ tác giả hoặc Quản trị viên mới có quyền xóa bài viết này');
      }
    }

    if (post.status === POST_STATUS.DELETED) {
      return { message: 'Bài viết đã ở trạng thái đã xóa' };
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.comment.updateMany({
        where: { post_id: postId, status: { not: COMMENT_STATUS.DELETED } },
        data: { status: COMMENT_STATUS.DELETED, deleted_at: now },
      });
      await tx.post.update({
        where: { post_id: postId },
        data: { status: POST_STATUS.DELETED, deleted_at: now },
      });
    });

    return { message: 'Bài viết đã được xóa thành công' };
  },
};
