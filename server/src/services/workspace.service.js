// d:\Projects\FPT\SWP391\server\src\services\workspace.service.js
import { createHash } from 'node:crypto';
import prisma from '../config/prisma.js';
import { workspaceRepository } from '../repositories/workspace.repository.js';
import { ApiError } from '../utils/apiError.js';

export const ingredientImageUrl = (ingredientId) =>
  `/api/workspace/ingredients/${ingredientId}/image`;

export const workspaceService = {
  /**
   * Tải toàn bộ danh mục tổng hợp công khai của hệ thống
   */
  async loadCatalog() {
    const raw = await workspaceRepository.fetchRawCatalogData();
    const {
      diets,
      categories,
      ingredients,
      details,
      swaps,
      recipes,
      posts,
      restaurants,
      placeDetails,
      reviews,
      prices,
    } = raw;

    // Vegan recipes may contain alliums, so do not infer Buddhist compatibility.
    // Keto and Eat Clean labels require explicit classification in the database.
    const compat = { 1: [1, 2, 3, 4], 2: [2, 4], 3: [3, 4], 4: [4], 5: [5] };

    const mappedIngredients = ingredients.map((i) => {
      const d = details.find((item) => item.ingredient_id === i.ingredient_id);
      return {
        ...i,
        ...d,
        id: String(i.ingredient_id),
        category: d?.category || 'other',
        origin: d?.origin || 'Chưa cập nhật',
        plant: d?.plant ?? null,
        description: d?.description || '',
        cooking: d?.cooking || '',
        aliases: d?.aliases || '',
        image: d?.image_url,
      };
    });

    const mappedRecipes = recipes.map((r) => ({
      ...r,
      image: r.image_url,
      ingredients: r.recipe_ingredients.map((p) => `${p.quantity} ${p.unit} ${p.ingredient.name}`),
      compatible_diet_type_ids: compat[r.diet_type_id] || (r.diet_type_id ? [r.diet_type_id] : []),
      nutrition: r.recipe_ingredients.reduce(
        (sum, p) => {
          for (const field of ['protein', 'carbs', 'fat']) {
            sum[field] += ((p.ingredient[field] || 0) * p.quantity) / 100;
          }
          return sum;
        },
        { protein: 0, carbs: 0, fat: 0, fiber: 0 }
      ),
    }));

    const mappedPosts = posts
      .filter((p) => p.blog || p.video)
      .map((p) => ({
        ...p,
        ...p.blog,
        ...p.video,
        author_full_name: p.author.full_name,
        initials: p.author.full_name
          .split(' ')
          .slice(-2)
          .map((s) => s[0])
          .join(''),
        category_id: p.post_categories[0]?.category_id || null,
        category: p.post_categories[0]?.category || null,
        content: p.blog?.content || p.video?.transcript || '',
        image: p.video?.thumbnail_url || null,
        attachments: (p.attachments || []).map((a) => ({
          id: a.attachment_id,
          url: a.file_url,
          type: a.file_type,
          name: a.file_name,
        })),
        vote_count: p.post_votes.reduce(
          (sum, v) => sum + (v.vote_type === 'UPVOTE' ? 1 : -1),
          0
        ),
        comments: p.comments.map((c) => ({
          ...c,
          user_full_name: c.user.full_name,
        })),
      }));

    const mappedRestaurants = restaurants.map((p) => {
      const d = placeDetails.find((item) => item.restaurant_id === p.restaurant_id);
      return {
        ...p,
        id: p.restaurant_id,
        latitude: p.latitude === null ? null : Number(p.latitude),
        longitude: p.longitude === null ? null : Number(p.longitude),
        type: p.diet_type_id === 5 ? 'buddhist' : p.diet_type_id === 1 ? 'vegan' : 'separate',
        city: d?.city || 'Chưa cập nhật',
        hours: d?.hours || 'Chưa cập nhật',
        price_range: d?.price_range || 'Chưa cập nhật',
        price: d?.price_range || '',
        separate: d?.separate_kitchen ?? null,
        image: p.image_url,
        dishes: p.restaurant_recipes.map((link) => link.recipe.recipe_name).join(', '),
        menu: p.restaurant_recipes.map((link) => ({
          name: link.recipe.recipe_name,
          recipe_id: link.recipe_id,
          price:
            prices.find(
              (price) =>
                price.restaurant_id === p.restaurant_id && price.recipe_id === link.recipe_id
            )?.price ?? null,
        })),
        reviews: reviews
          .filter((r) => r.restaurant_id === p.restaurant_id)
          .map((r) => ({
            id: r.review_id,
            name: r.full_name,
            stars: r.stars,
            text: r.content,
            date: r.created_at,
          })),
        rating: p.rating,
      };
    });

    return {
      diets,
      categories,
      swaps,
      ingredients: mappedIngredients,
      recipes: mappedRecipes,
      posts: mappedPosts,
      restaurants: mappedRestaurants,
    };
  },

  /**
   * Lấy danh sách bài viết blog của người dùng hiện tại
   */
  async getMyPosts(userId) {
    return workspaceRepository.findMyBlogs(userId);
  },

  /**
   * Lấy hồ sơ dinh dưỡng, nhật ký bữa ăn và kế hoạch tuần
   */
  async getJournal(userId) {
    const { profile, prefs, days, nutrients, plans } =
      await workspaceRepository.fetchJournalData(userId);

    const journal = {
      profile: profile
        ? {
            height: profile.height,
            weight: profile.weight,
            calorieGoal: prefs[0]?.calorie_goal || 0,
            goal: prefs[0]?.goal || profile.health_goal || 'Theo dõi',
            macroGoals: {
              protein: prefs[0]?.protein_goal || 0,
              carbs: prefs[0]?.carbs_goal || 0,
              fat: prefs[0]?.fat_goal || 0,
              fiber: prefs[0]?.fiber_goal || 0,
            },
          }
        : null,
      days: {},
      plans: {},
    };

    const groups = {
      BREAKFAST: 'breakfast',
      LUNCH: 'lunch',
      DINNER: 'dinner',
      SNACK: 'snack',
    };

    for (const d of days) {
      const key = d.consumed_date?.toISOString().slice(0, 10);
      if (!key) continue;
      const n = nutrients.find((item) => item.diary_id === d.diary_id);
      (journal.days[key] ??= []).push({
        id: d.diary_id,
        name: d.recipe?.recipe_name || d.custom_food_name || 'Món ăn',
        group: groups[d.meal_type],
        calories: d.calories || 0,
        serving: n?.serving || '',
        protein: n?.protein || 0,
        carbs: n?.carbs || 0,
        fat: n?.fat || 0,
        fiber: n?.fiber || 0,
      });
    }

    for (const plan of plans) {
      for (const detail of plan.details) {
        const day = new Date(plan.start_date);
        day.setUTCDate(day.getUTCDate() + detail.day_of_week - 1);
        const key = day.toISOString().slice(0, 10);
        (journal.plans[key] ??= {})[groups[detail.meal_type]] = detail.recipe_id
          ? String(detail.recipe_id)
          : '';
      }
    }

    return journal;
  },

  /**
   * Truy vấn danh sách công thức nấu ăn có phân trang và lọc
   */
  async getRecipes(query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where = {
      OR: [{ post_id: null }, { post: { status: 'PUBLISHED' } }],
    };

    if (query.categoryId || query.category_id) {
      where.category_id = Number(query.categoryId || query.category_id);
    }

    if (query.dietTypeId || query.diet_type_id) {
      where.diet_type_id = Number(query.dietTypeId || query.diet_type_id);
    }

    if (query.search) {
      const searchStr = String(query.search).trim();
      where.recipe_name = { contains: searchStr, mode: 'insensitive' };
    }

    const [total, recipes] = await Promise.all([
      workspaceRepository.countRecipes(where),
      workspaceRepository.findRecipes({
        where,
        skip,
        take: limit,
      }),
    ]);

    const compat = { 1: [1, 2, 3, 4], 2: [2, 4], 3: [3, 4], 4: [4], 5: [5] };
    const mapped = recipes.map((r) => ({
      ...r,
      image: r.image_url,
      ingredients: (r.recipe_ingredients || []).map((p) => `${p.quantity} ${p.unit} ${p.ingredient?.name || ''}`),
      compatible_diet_type_ids: compat[r.diet_type_id] || (r.diet_type_id ? [r.diet_type_id] : []),
      nutrition: (r.recipe_ingredients || []).reduce(
        (sum, p) => {
          for (const field of ['protein', 'carbs', 'fat']) {
            sum[field] += (((p.ingredient && p.ingredient[field]) || 0) * p.quantity) / 100;
          }
          return sum;
        },
        { protein: 0, carbs: 0, fat: 0, fiber: 0 }
      ),
    }));

    return {
      recipes: mapped,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Truy vấn danh sách nguyên liệu chay có phân trang và lọc
   */
  async getIngredients(query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where = {};
    if (query.search) {
      const searchStr = String(query.search).trim();
      where.name = { contains: searchStr, mode: 'insensitive' };
    }

    const [total, ingredients] = await Promise.all([
      workspaceRepository.countIngredients(where),
      workspaceRepository.findIngredients({
        where,
        skip,
        take: limit,
      }),
    ]);

    return {
      ingredients: ingredients.map((i) => ({
        ...i,
        id: String(i.ingredient_id),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Cập nhật thông tin chiều cao, cân nặng, mục tiêu calo
   */
  async updateProfile(userId, { height, weight, calorieGoal, goal }) {
    await prisma.$transaction(async (tx) => {
      await workspaceRepository.upsertProfile(userId, { height, weight, goal }, tx);
      await workspaceRepository.upsertProfilePreferences(userId, calorieGoal, goal, tx);
    });

    return { saved: true };
  },

  /**
   * Thêm món vào nhật ký ăn uống
   */
  async addDiaryEntry(userId, data) {
    return prisma.$transaction(async (tx) => {
      if (data.recipe_id) {
        const exists = await workspaceRepository.findRecipeById(data.recipe_id, tx);
        if (!exists) throw ApiError.notFound('Không tìm thấy công thức');
      }

      const entry = await workspaceRepository.createFoodDiary(
        {
          user_id: Number(userId),
          consumed_date: new Date(data.date),
          meal_type: data.group,
          custom_food_name: data.name,
          recipe_id: data.recipe_id || null,
          calories: data.calories,
        },
        tx
      );

      await workspaceRepository.insertDiaryNutrients(
        entry.diary_id,
        {
          serving: data.serving,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          fiber: data.fiber,
        },
        tx
      );

      return entry;
    });
  },

  /**
   * Xóa một mục khỏi nhật ký ăn uống
   */
  async deleteDiaryEntry(userId, diaryId) {
    const result = await workspaceRepository.deleteFoodDiary(diaryId, userId);
    if (!result.count) {
      throw ApiError.notFound('Không tìm thấy nhật ký của bạn');
    }
    return { deleted: true };
  },

  /**
   * Lên kế hoạch thực đơn theo ngày trong tuần
   */
  async setMealPlan(userId, { date, group, recipe_id }) {
    return prisma.$transaction(async (tx) => {
      if (recipe_id) {
        const exists = await workspaceRepository.findRecipeById(recipe_id, tx);
        if (!exists) throw ApiError.notFound('Không tìm thấy công thức');
      }

      const day = new Date(date);
      const monday = new Date(day);
      monday.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
      const end = new Date(monday);
      end.setUTCDate(end.getUTCDate() + 6);

      let plan = await workspaceRepository.findMealPlanByStartDate(userId, monday, tx);
      if (!plan) {
        plan = await workspaceRepository.createMealPlan(
          {
            user_id: Number(userId),
            start_date: monday,
            end_date: end,
            title: `Thực đơn tuần ${monday.toISOString().slice(0, 10)}`,
          },
          tx
        );
      }

      const day_of_week = ((day.getUTCDay() + 6) % 7) + 1;
      const where = { plan_id: plan.plan_id, day_of_week, meal_type: group };

      await workspaceRepository.deleteMealPlanDetails(where, tx);
      if (recipe_id) {
        await workspaceRepository.createMealPlanDetail({ ...where, recipe_id }, tx);
      }

      return { saved: true };
    });
  },

  /**
   * Sao chép toàn bộ món từ thực đơn tuần sang nhật ký ăn uống thực tế
   */
  async recordPlanToDiary(userId, { date }) {
    return prisma.$transaction(async (tx) => {
      await workspaceRepository.lockUserDate(userId, date, tx);
      const day = new Date(date);

      const existingCount = await workspaceRepository.countDiariesOnDate(userId, day, tx);
      if (existingCount > 0) {
        throw ApiError.conflict('Ngày này đã có nhật ký.');
      }

      const plans = await workspaceRepository.findPlansForDate(userId, day, tx);
      const meals = new Map();

      for (const plan of plans) {
        const offset = Math.round((day - plan.start_date) / 86400000) + 1;
        for (const detail of plan.details.filter((d) => d.day_of_week === offset && d.recipe)) {
          if (!meals.has(detail.meal_type)) {
            meals.set(detail.meal_type, detail.recipe);
          }
        }
      }

      if (!meals.size) {
        throw ApiError.badRequest('Ngày này chưa có món trong kế hoạch.');
      }

      for (const [meal_type, recipe] of meals) {
        const entry = await workspaceRepository.createFoodDiary(
          {
            user_id: Number(userId),
            consumed_date: day,
            meal_type,
            recipe_id: recipe.recipe_id,
            calories: recipe.total_calories,
          },
          tx
        );

        const n = { protein: 0, carbs: 0, fat: 0 };
        for (const part of recipe.recipe_ingredients) {
          for (const field of Object.keys(n)) {
            n[field] += ((part.ingredient[field] || 0) * part.quantity) / 100;
          }
        }

        await workspaceRepository.insertDiaryNutrients(
          entry.diary_id,
          {
            serving: '1 phần',
            protein: n.protein,
            carbs: n.carbs,
            fat: n.fat,
          },
          tx
        );
      }

      return { saved: true };
    });
  },

  /**
   * Đề xuất một địa điểm quán ăn chay mới
   */
  async suggestRestaurant(data) {
    return prisma.$transaction(async (tx) => {
      const dietExists = await workspaceRepository.findDietTypeById(data.diet_type_id, tx);
      if (!dietExists) {
        throw ApiError.badRequest('Chế độ ăn không hợp lệ');
      }

      const place = await tx.restaurant.create({
        data: {
          name: data.name,
          address: data.address,
          diet_type_id: data.diet_type_id,
          latitude: data.latitude,
          longitude: data.longitude,
          rating: null,
        },
      });

      await workspaceRepository.insertRestaurantDetails(place.restaurant_id, data.city, tx);
      return place;
    });
  },

  /**
   * Đăng bài đánh giá và cập nhật điểm số nhà hàng
   */
  async reviewRestaurant(userId, restaurantId, { stars, text }) {
    return prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.findUnique({
        where: { restaurant_id: Number(restaurantId) },
      });
      if (!restaurant) {
        throw ApiError.notFound('Quán không tồn tại');
      }

      await workspaceRepository.insertRestaurantReview(restaurantId, userId, stars, text, tx);
      const avg = await workspaceRepository.calculateAvgRestaurantStars(restaurantId, tx);
      await tx.restaurant.update({
        where: { restaurant_id: Number(restaurantId) },
        data: { rating: avg[0].rating },
      });

      return { saved: true };
    });
  },

  /**
   * Truy xuất dữ liệu nhị phân của ảnh nguyên liệu
   */
  async getIngredientImage(ingredientId) {
    const id = Number(ingredientId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw ApiError.badRequest('Mã nguyên liệu không hợp lệ.');
    }

    const [image] = await workspaceRepository.getIngredientImage(id);

    if (
      !image?.image_data ||
      !['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(image.mime_type)
    ) {
      throw ApiError.notFound('Chưa có ảnh nguyên liệu.');
    }

    const bytes = Buffer.from(image.image_data);
    const etag = `"${createHash('sha256').update(bytes).digest('hex')}"`;

    return {
      bytes,
      mimeType: image.mime_type,
      etag,
    };
  },
};

export const loadCatalog = workspaceService.loadCatalog.bind(workspaceService);
