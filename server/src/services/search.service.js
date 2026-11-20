// d:\Projects\FPT\SWP391\server\src\services\search.service.js
// Nghiệp vụ tìm kiếm toàn cục blog/video và gợi ý video, quán ăn theo từ khóa.
import { postRepository } from '../repositories/post.repository.js';
import { placeRepository } from '../repositories/place.repository.js';
import { POST_STATUS } from '../constants/index.js';
import { ApiError } from '../utils/index.js';

export const searchService = {
  /**
   * Tìm kiếm toàn cục Blog và Video theo từ khóa trên PostgreSQL
   */
  async globalSearch(rawQuery, { type = 'ALL', page = 1, limit = 20, categoryId } = {}) {
    const query = rawQuery ? String(rawQuery).trim() : '';
    if (!query) {
      throw ApiError.badRequest('Query parameter "q" is required');
    }

    // Giới hạn tối đa 100 kết quả mỗi trang để tránh truy vấn quá nặng.
    const safePage = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * take;
    const catId = categoryId ? Number(categoryId) : null;

    const shouldSearchBlogs = type === 'ALL' || type === 'BLOG';
    const shouldSearchVideos = type === 'ALL' || type === 'VIDEO';

    // Chỉ tìm trong bài đã đăng và chưa bị xóa; blog khớp theo tiêu đề hoặc nội dung.
    const blogWhere = {
      post: {
        status: POST_STATUS.PUBLISHED,
        deleted_at: null,
        ...(catId ? { post_categories: { some: { category_id: catId } } } : {}),
      },
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ],
    };

    // Video khớp theo tiêu đề hoặc transcript.
    const videoWhere = {
      post: {
        status: POST_STATUS.PUBLISHED,
        deleted_at: null,
        ...(catId ? { post_categories: { some: { category_id: catId } } } : {}),
      },
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { transcript: { contains: query, mode: 'insensitive' } },
      ],
    };

    const blogInclude = {
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
          _count: {
            select: {
              comments: true,
              post_votes: true,
            },
          },
        },
      },
      attached_video: true,
    };

    const videoInclude = {
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
          _count: {
            select: {
              comments: true,
              post_votes: true,
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

    // Chạy song song truy vấn dữ liệu và đếm; loại không được chọn trả về rỗng để giữ cấu trúc kết quả.
    const [matchedBlogs, totalBlogs, matchedVideos, totalVideos] = await Promise.all([
      shouldSearchBlogs
        ? postRepository.findAllBlogs({
            where: blogWhere,
            include: blogInclude,
            orderBy,
            skip,
            take,
          })
        : Promise.resolve([]),
      shouldSearchBlogs
        ? postRepository.countBlogs({ where: blogWhere })
        : Promise.resolve(0),
      shouldSearchVideos
        ? postRepository.findAllVideos({
            where: videoWhere,
            include: videoInclude,
            orderBy,
            skip,
            take,
          })
        : Promise.resolve([]),
      shouldSearchVideos
        ? postRepository.countVideos({ where: videoWhere })
        : Promise.resolve(0),
    ]);

    // Làm phẳng dữ liệu post vào blog và thêm cả category_id lẫn categoryId để tương thích các màn hình FE khác nhau.
    const formattedBlogs = matchedBlogs.map((b) => {
      const { post, ...blogData } = b;
      const firstCat = post?.post_categories?.[0];
      const attachments = (post?.attachments || []).map((a) => ({
        id: a.attachment_id,
        url: a.file_url,
        type: a.file_type ? a.file_type.toLowerCase() : 'image',
        name: a.file_name,
      }));
      return {
        ...post,
        ...blogData,
        author_full_name: post?.author?.full_name || '',
        category_id: firstCat?.category_id || null,
        categoryId: firstCat?.category_id || null,
        category: firstCat?.category || null,
        attachments,
        comment_count: post?._count?.comments ?? 0,
        vote_count: post?._count?.post_votes ?? 0,
      };
    });

    const formattedVideos = matchedVideos.map((v) => {
      const { post, ...videoData } = v;
      const firstCat = post?.post_categories?.[0];
      return {
        ...post,
        ...videoData,
        author_full_name: post?.author?.full_name || '',
        category_id: firstCat?.category_id || null,
        categoryId: firstCat?.category_id || null,
        category: firstCat?.category || null,
        comment_count: post?._count?.comments ?? 0,
        vote_count: post?._count?.post_votes ?? 0,
      };
    });

    const total = totalBlogs + totalVideos;

    return {
      query,
      type,
      results: {
        blogs: formattedBlogs,
        videos: formattedVideos,
      },
      meta: {
        page: safePage,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
        totalBlogs,
        totalVideos,
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
    const matchedVideos = await postRepository.findAllVideos({
      where: {
        post: {
          status: POST_STATUS.PUBLISHED,
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
        // Khớp tiêu đề được ưu tiên (5 điểm) hơn khớp transcript (2 điểm).
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
    const matchedRestaurants = await placeRepository.findRestaurants({
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
        // Khớp tên quán 5 điểm, mỗi món khớp từ khóa thêm 3 điểm.
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

// Bí danh tương thích ngược cho các nơi còn import recommendationService.
export const recommendationService = searchService;
