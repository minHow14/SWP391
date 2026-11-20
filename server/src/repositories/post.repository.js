// D:/SWP391/SWP391/server/src/repositories/post.repository.js
// Repository truy cập bài viết (post) và hai loại chi tiết blog/video, cùng danh mục, tệp đính kèm và dọn dẹp bài đã xóa.
import prisma from '../config/prisma.js';

export const postRepository = {
  // Khóa dòng blog (SELECT ... FOR UPDATE) để tránh sửa đồng thời gây mất dữ liệu.
  lockBlog(postId, db = prisma) {
    return db.$queryRaw`SELECT post_id FROM blogs WHERE post_id = ${postId} FOR UPDATE`;
  },
  // Tạo bản ghi post gốc.
  async createPost(data, db = prisma) {
    return db.post.create({ data });
  },

  // Tạo chi tiết blog cho post.
  async createBlog(data, include = null, db = prisma) {
    return db.blog.create({
      data,
      ...(include ? { include } : {}),
    });
  },

  // Tạo chi tiết video cho post.
  async createVideo(data, db = prisma) {
    return db.video.create({ data });
  },

  // Tìm post theo ID.
  async findPostById(postId, include = null, db = prisma) {
    return db.post.findUnique({
      where: { post_id: Number(postId) },
      ...(include ? { include } : {}),
    });
  },

  // Tìm chi tiết blog theo post_id.
  async findBlogById(postId, include = null, db = prisma) {
    return db.blog.findFirst({
      where: { post_id: Number(postId) },
      ...(include ? { include } : {}),
    });
  },

  // Tìm chi tiết video theo post_id.
  async findVideoById(postId, include = null, db = prisma) {
    return db.video.findFirst({
      where: { post_id: Number(postId) },
      ...(include ? { include } : {}),
    });
  },

  // Lấy danh sách blog theo tham số Prisma.
  async findAllBlogs(args = {}, db = prisma) {
    return db.blog.findMany(args);
  },

  // Đếm blog.
  async countBlogs(args = {}, db = prisma) {
    return db.blog.count(args);
  },

  // Lấy danh sách video theo tham số Prisma.
  async findAllVideos(args = {}, db = prisma) {
    return db.video.findMany(args);
  },

  // Đếm video.
  async countVideos(args = {}, db = prisma) {
    return db.video.count(args);
  },

  // Cập nhật chi tiết blog.
  async updateBlog(postId, data, include = null, db = prisma) {
    return db.blog.update({
      where: { post_id: Number(postId) },
      data,
      ...(include ? { include } : {}),
    });
  },

  // Cập nhật chi tiết video.
  async updateVideo(postId, data, include = null, db = prisma) {
    return db.video.update({
      where: { post_id: Number(postId) },
      data,
      ...(include ? { include } : {}),
    });
  },

  // Cập nhật post gốc.
  async updatePost(postId, data, include = null, db = prisma) {
    return db.post.update({
      where: { post_id: Number(postId) },
      data,
      ...(include ? { include } : {}),
    });
  },

  // Xóa post theo ID.
  async deletePost(postId, db = prisma) {
    return db.post.delete({
      where: { post_id: Number(postId) },
    });
  },

  // Xóa vĩnh viễn post cùng mọi dữ liệu phụ thuộc theo đúng thứ tự khóa ngoại.
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

    // Đã ở trong transaction (db là transaction client không có $transaction) thì chạy trực tiếp, tránh lồng transaction.
    return typeof db.$transaction === 'function' ? db.$transaction(execute) : execute(db);
  },

  // Đếm post.
  async countPosts(args = {}, db = prisma) {
    return db.post.count(args);
  },

  // Lấy danh sách post theo tham số Prisma.
  async findPosts(args = {}, db = prisma) {
    return db.post.findMany(args);
  },

  // Tìm danh mục theo ID.
  async findCategoryById(categoryId, db = prisma) {
    return db.category.findUnique({
      where: { category_id: Number(categoryId) },
    });
  },

  // Gán danh mục cho post: xóa liên kết cũ rồi tạo mới (mỗi post chỉ một danh mục); categoryId rỗng nghĩa là bỏ danh mục.
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

  // Thay toàn bộ tệp đính kèm của post và trả về danh sách mới theo thứ tự tải lên.
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
          // Chuẩn hóa loại tệp về chữ thường để so sánh nhất quán ở các tầng khác.
          file_type: String(item.type || 'image').trim().toLowerCase(),
          file_name: item.name || null,
        })),
      });
    }
    return db.postAttachment.findMany({
      where: { post_id: numericPostId },
      orderBy: { attachment_id: 'asc' },
    });
  },

  // Lấy tệp đính kèm của post theo thứ tự tải lên.
  async findAttachmentsByPostId(postId, db = prisma) {
    return db.postAttachment.findMany({
      where: { post_id: Number(postId) },
      orderBy: { attachment_id: 'asc' },
    });
  },

  // Đếm post đã xóa mềm.
  async countDeleted(db = prisma) {
    return db.post.count({ where: { status: 'DELETED' } });
  },

  // Đếm post đã xóa mềm quá hạn lưu giữ.
  async countExpiredDeleted(threshold, db = prisma) {
    return db.post.count({ where: { status: 'DELETED', deleted_at: { lte: threshold } } });
  },

  // Lấy ID post đã xóa mềm quá hạn để xóa vĩnh viễn.
  async findExpiredDeletedPostIds(threshold, db = prisma) {
    return db.post.findMany({
      where: { status: 'DELETED', deleted_at: { lte: threshold } },
      select: { post_id: true },
    });
  },

  // Gỡ liên kết công thức khỏi các post sắp xóa để công thức không bị mất theo.
  async unlinkRecipesByPostIds(postIds, db = prisma) {
    return db.recipe.updateMany({
      where: { post_id: { in: postIds } },
      data: { post_id: null },
    });
  },

  // Xóa vĩnh viễn post theo danh sách ID.
  async deletePostsByIds(postIds, db = prisma) {
    return db.post.deleteMany({
      where: { post_id: { in: postIds } },
    });
  },
};
