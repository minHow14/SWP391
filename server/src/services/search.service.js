import prisma from '../config/prisma.js';
import { POST_STATUS } from '../constants/index.js';
import { ApiError } from '../utils/index.js';

export const searchService = {
  /**
   * Tìm kiếm toàn cục Blog và Video theo từ khóa trên PostgreSQL
   */
  async globalSearch(rawQuery) {
    const query = rawQuery ? String(rawQuery).trim() : '';
    if (!query) {
      throw ApiError.badRequest('Query parameter "q" is required');
    }

    // SỬA LỖI BUG-004: Tận dụng SQL LIKE/ILIKE case-insensitive, hoàn toàn không sợ null crash
    const [matchedBlogs, matchedVideos] = await Promise.all([
      prisma.blog.findMany({
        where: {
          post: {
            status: { not: POST_STATUS.DELETED },
          },
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ],
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
      }),

      prisma.video.findMany({
        where: {
          post: {
            status: { not: POST_STATUS.DELETED },
          },
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { transcript: { contains: query, mode: 'insensitive' } },
          ],
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
        },
        orderBy: {
          post: {
            created_at: 'desc',
          },
        },
      }),
    ]);

    const formattedBlogs = matchedBlogs.map((b) => {
      const { post, ...blogData } = b;
      return { ...post, ...blogData };
    });

    const formattedVideos = matchedVideos.map((v) => {
      const { post, ...videoData } = v;
      return { ...post, ...videoData };
    });

    return {
      query,
      results: {
        blogs: formattedBlogs,
        videos: formattedVideos,
      },
    };
  },
};
