// d:\Projects\FPT\SWP391\server\src\services\search.service.js
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

  /**
   * Đề xuất Video và Quán ăn / Nhà hàng dựa trên từ khóa từ cơ sở dữ liệu
   */
  async suggestByKeyword(rawKeyword) {
    const keyword = rawKeyword ? String(rawKeyword).trim() : '';
    if (!keyword) {
      throw ApiError.badRequest('Query parameter "keyword" is required');
    }

    const lowerKeyword = keyword.toLowerCase();

    // 1. Tìm video gợi ý từ cơ sở dữ liệu
    const matchedVideos = await prisma.video.findMany({
      where: {
        post: {
          status: { not: POST_STATUS.DELETED },
        },
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { transcript: { contains: keyword, mode: 'insensitive' } },
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
    });

    const suggestedVideos = matchedVideos
      .map((v) => {
        let score = 0;
        const title = (v.title || '').toLowerCase();
        const transcript = (v.transcript || '').toLowerCase();

        if (title.includes(lowerKeyword)) score += 5;
        if (transcript.includes(lowerKeyword)) score += 2;

        const { post, ...videoData } = v;
        return {
          ...post,
          ...videoData,
          matchScore: score,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    // 2. Tìm quán ăn gợi ý theo tên nhà hàng hoặc theo món ăn phục vụ
    const matchedRestaurants = await prisma.restaurant.findMany({
      where: {
        OR: [
          { name: { contains: keyword, mode: 'insensitive' } },
          {
            restaurant_recipes: {
              some: {
                recipe: {
                  recipe_name: { contains: keyword, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      },
      include: {
        diet_type: true,
        restaurant_recipes: {
          include: {
            recipe: true,
          },
        },
      },
    });

    const suggestedShops = matchedRestaurants
      .map((shop) => {
        let score = 0;
        const shopName = (shop.name || '').toLowerCase();
        if (shopName.includes(lowerKeyword)) score += 5;

        const matchingRecipes = (shop.restaurant_recipes || [])
          .map((rr) => rr.recipe)
          .filter((r) => r && (r.recipe_name || '').toLowerCase().includes(lowerKeyword));

        score += matchingRecipes.length * 3;

        return {
          restaurant_id: shop.restaurant_id,
          name: shop.name,
          address: shop.address,
          phone: shop.phone,
          image_url: shop.image_url,
          rating: shop.rating,
          latitude: shop.latitude ? Number(shop.latitude) : null,
          longitude: shop.longitude ? Number(shop.longitude) : null,
          diet_type: shop.diet_type?.name || null,
          matchScore: score,
          matchedRecipes: matchingRecipes.map((r) => r.recipe_name),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return {
      keyword,
      recommendations: {
        videos: suggestedVideos,
        shops: suggestedShops,
      },
    };
  },
};

// Alias tương thích ngược
export const recommendationService = searchService;
