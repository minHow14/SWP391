// D:/SWP391/SWP391/server/src/repositories/post.repository.js
import prisma from '../config/prisma.js';

export const postRepository = {
  lockBlog(postId, db = prisma) {
    return db.$queryRaw`SELECT post_id FROM blogs WHERE post_id = ${postId} FOR UPDATE`;
  },
  async createPost(data, db = prisma) {
    return db.post.create({ data });
  },

  async createBlog(data, include = null, db = prisma) {
    return db.blog.create({
      data,
      ...(include ? { include } : {}),
    });
  },

  async createVideo(data, db = prisma) {
    return db.video.create({ data });
  },

  async findPostById(postId, include = null, db = prisma) {
    return db.post.findUnique({
      where: { post_id: Number(postId) },
      ...(include ? { include } : {}),
    });
  },

  async findBlogById(postId, include = null, db = prisma) {
    return db.blog.findFirst({
      where: { post_id: Number(postId) },
      ...(include ? { include } : {}),
    });
  },

  async findVideoById(postId, include = null, db = prisma) {
    return db.video.findFirst({
      where: { post_id: Number(postId) },
      ...(include ? { include } : {}),
    });
  },

  async findAllBlogs(args = {}, db = prisma) {
    return db.blog.findMany(args);
  },

  async findAllVideos(args = {}, db = prisma) {
    return db.video.findMany(args);
  },

  async updateBlog(postId, data, include = null, db = prisma) {
    return db.blog.update({
      where: { post_id: Number(postId) },
      data,
      ...(include ? { include } : {}),
    });
  },

  async updateVideo(postId, data, include = null, db = prisma) {
    return db.video.update({
      where: { post_id: Number(postId) },
      data,
      ...(include ? { include } : {}),
    });
  },

  async updatePost(postId, data, include = null, db = prisma) {
    return db.post.update({
      where: { post_id: Number(postId) },
      data,
      ...(include ? { include } : {}),
    });
  },

  async deletePost(postId, db = prisma) {
    return db.post.delete({
      where: { post_id: Number(postId) },
    });
  },

  async hardDeletePost(postId, db = prisma) {
    const id = Number(postId);
    const execute = async (tx) => {
      // 1. Gỡ liên kết post_id ở bảng recipes để không vi phạm khóa ngoại
      await tx.recipe.updateMany({
        where: { post_id: id },
        data: { post_id: null },
      });

      // 2. Xóa các báo cáo liên quan đến bình luận thuộc bài viết
      const comments = await tx.comment.findMany({
        where: { post_id: id },
        select: { comment_id: true },
      });
      const commentIds = comments.map((c) => c.comment_id);
      if (commentIds.length > 0) {
        await tx.report.deleteMany({
          where: { comment_id: { in: commentIds } },
        });
        await tx.comment.deleteMany({
          where: { post_id: id },
        });
      }

      // 3. Xóa các báo cáo vi phạm liên kết trực tiếp tới bài viết
      await tx.report.deleteMany({
        where: { post_id: id },
      });

      // 4. Xóa tệp đính kèm, lượt bình chọn và phân loại danh mục
      await tx.postAttachment.deleteMany({
        where: { post_id: id },
      });
      await tx.postVote.deleteMany({
        where: { post_id: id },
      });
      await tx.postCategory.deleteMany({
        where: { post_id: id },
      });

      // 5. Gỡ liên kết video đính kèm ở các bài blog khác nếu có
      await tx.blog.updateMany({
        where: { attached_video_id: id },
        data: { attached_video_id: null },
      });

      // 6. Xóa chi tiết blog hoặc video
      await tx.blog.deleteMany({
        where: { post_id: id },
      });
      await tx.video.deleteMany({
        where: { post_id: id },
      });

      // 7. Xóa vĩnh viễn bài viết chính khỏi cơ sở dữ liệu
      return tx.post.delete({
        where: { post_id: id },
      });
    };

    return typeof db.$transaction === 'function' ? db.$transaction(execute) : execute(db);
  },

  async countPosts(args = {}, db = prisma) {
    return db.post.count(args);
  },

  async findPosts(args = {}, db = prisma) {
    return db.post.findMany(args);
  },

  async findCategoryById(categoryId, db = prisma) {
    return db.category.findUnique({
      where: { category_id: Number(categoryId) },
    });
  },

  async setPostCategory(postId, categoryId, db = prisma) {
    const numericPostId = Number(postId);
    await db.postCategory.deleteMany({
      where: { post_id: numericPostId },
    });
    if (categoryId) {
      return db.postCategory.create({
        data: {
          post_id: numericPostId,
          category_id: Number(categoryId),
        },
      });
    }
    return null;
  },

  async setPostAttachments(postId, attachments = [], db = prisma) {
    const numericPostId = Number(postId);
    await db.postAttachment.deleteMany({
      where: { post_id: numericPostId },
    });
    if (attachments && attachments.length > 0) {
      await db.postAttachment.createMany({
        data: attachments.map((item) => ({
          post_id: numericPostId,
          file_url: item.url,
          file_type: item.type || 'image',
          file_name: item.name || null,
        })),
      });
    }
    return db.postAttachment.findMany({
      where: { post_id: numericPostId },
      orderBy: { attachment_id: 'asc' },
    });
  },

  async findAttachmentsByPostId(postId, db = prisma) {
    return db.postAttachment.findMany({
      where: { post_id: Number(postId) },
      orderBy: { attachment_id: 'asc' },
    });
  },

  async countDeleted(db = prisma) {
    return db.post.count({ where: { status: 'DELETED' } });
  },

  async countExpiredDeleted(threshold, db = prisma) {
    return db.post.count({ where: { status: 'DELETED', deleted_at: { lte: threshold } } });
  },

  async findExpiredDeletedPostIds(threshold, db = prisma) {
    return db.post.findMany({
      where: { status: 'DELETED', deleted_at: { lte: threshold } },
      select: { post_id: true },
    });
  },

  async unlinkRecipesByPostIds(postIds, db = prisma) {
    return db.recipe.updateMany({
      where: { post_id: { in: postIds } },
      data: { post_id: null },
    });
  },

  async deletePostsByIds(postIds, db = prisma) {
    return db.post.deleteMany({
      where: { post_id: { in: postIds } },
    });
  },
};
