// d:\Projects\FPT\SWP391\server\src\repositories\workspace.repository.js
// Repository cho không gian làm việc (workspace): dữ liệu danh mục tổng hợp, bài viết của tôi, nhật ký ăn uống, kế hoạch bữa ăn, nhà hàng và công thức.
import prisma from '../config/prisma.js';

export const workspaceRepository = {
  // Tải toàn bộ dữ liệu danh mục cho workspace trong một lần (chạy song song) để FE dựng các màn hình mà không phải gọi nhiều API.
  async fetchRawCatalogData(db = prisma) {
    const [
      diets,
      categories,
      ingredients,
      details,
      swaps,
      recipes,
      posts,
      restaurants,
      reviews,
    ] = await Promise.all([
      db.dietType.findMany({ orderBy: { diet_type_id: 'asc' } }),
      db.category.findMany({ orderBy: { category_id: 'asc' } }),
      db.ingredient.findMany({ orderBy: { ingredient_id: 'asc' } }),
      db.$queryRaw`SELECT * FROM ingredient_details`,
      db.$queryRaw`SELECT * FROM ingredient_alternatives ORDER BY id`,
      db.recipe.findMany({
        // Chỉ lấy công thức độc lập hoặc gắn với bài đã đăng, tránh lộ công thức của bài chưa công khai.
        where: { OR: [{ post_id: null }, { post: { status: 'PUBLISHED' } }] },
        include: { recipe_ingredients: { include: { ingredient: true } } },
      }),
      db.post.findMany({
        where: { status: 'PUBLISHED', post_type: { in: ['BLOG', 'VIDEO'] } },
        orderBy: { created_at: 'desc' },
        include: {
          author: { select: { user_id: true, full_name: true } },
          blog: true,
          video: true,
          post_categories: { include: { category: true } },
          comments: { where: { status: 'ACTIVE' }, include: { user: { select: { full_name: true } } } },
          post_votes: true,
          attachments: { orderBy: { attachment_id: 'asc' } },
        },
      }),
      db.restaurant.findMany({
        orderBy: { restaurant_id: 'asc' },
        include: { restaurant_recipes: { include: { recipe: true } } },
      }),
      db.$queryRaw`SELECT r.review_id, r.restaurant_id, r.stars, r.content, r.created_at, u.full_name FROM restaurant_reviews r JOIN users u USING(user_id) ORDER BY r.created_at DESC`,
    ]);

    // Tách các trường chi tiết nhà hàng và bảng giá món thành mảng riêng để giữ cấu trúc dữ liệu FE đang dùng.
    const placeDetails = restaurants.map((r) => ({
      restaurant_id: r.restaurant_id,
      city: r.city,
      hours: r.hours,
      price_range: r.priceRange,
      separate_kitchen: r.separateKitchen,
    }));
    const prices = restaurants.flatMap((r) =>
      (r.restaurant_recipes || []).map((rr) => ({
        restaurant_id: rr.restaurant_id,
        recipe_id: rr.recipe_id,
        price: rr.price,
      }))
    );

    return {
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
    };
  },

  // Lấy các bài viết (blog/video) chưa xóa của người dùng, đã làm phẳng sẵn cho màn hình "Bài viết của tôi".
  async findMyBlogs(userId, db = prisma) {
    const posts = await db.post.findMany({
      where: {
        author_id: Number(userId),
        status: { not: 'DELETED' },
        post_type: { in: ['BLOG', 'VIDEO'] },
      },
      include: {
        blog: true,
        video: true,
        post_categories: {
          include: {
            category: true,
          },
        },
        attachments: { orderBy: { attachment_id: 'asc' } },
        comments: { where: { status: 'ACTIVE' }, include: { user: { select: { full_name: true } } } },
        post_votes: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return posts.map((p) => {
      const firstCat = p.post_categories?.[0];
      const blogOrVideo = p.blog || p.video || {};
      return {
        ...blogOrVideo,
        ...p,
        post: p,
        category_id: firstCat?.category_id || null,
        categoryId: firstCat?.category_id || null,
        category: firstCat?.category || null,
        content: p.blog?.content || p.video?.transcript || '',
        video_url: p.video?.video_url || null,
        thumbnail_url: p.video?.thumbnail_url || null,
        attachments: (p.attachments || []).map((a) => ({
          id: a.attachment_id,
          url: a.file_url,
          type: a.file_type ? a.file_type.toLowerCase() : 'image',
          name: a.file_name,
        })),
        // Điểm bình chọn = số upvote - số downvote.
        vote_count: (p.post_votes || []).reduce(
          (sum, v) => sum + (v.vote_type === 'UPVOTE' ? 1 : -1),
          0
        ),
        comments: (p.comments || []).map((c) => ({
          ...c,
          user_full_name: c.user?.full_name,
        })),
      };
    });
  },

  // Lấy dữ liệu Nhật Ký của người dùng: hồ sơ, nhật ký ăn uống và các kế hoạch bữa ăn.
  async fetchJournalData(userId, db = prisma) {
    const numericUserId = Number(userId);
    const [profile, days, plans] = await Promise.all([
      db.healthProfile.findUnique({ where: { user_id: numericUserId } }),
      db.foodDiary.findMany({
        where: { user_id: numericUserId },
        include: { recipe: true },
        orderBy: { consumed_date: 'desc' },
      }),
      db.mealPlan.findMany({
        where: { user_id: numericUserId },
        include: { details: true },
      }),
    ]);

    // Chuyển mục tiêu dinh dưỡng trong hồ sơ sang dạng mảng `prefs` mà FE đang dùng.
    const prefs = profile
      ? [
          {
            user_id: numericUserId,
            goal: profile.goal,
            calorie_goal: profile.calorieGoal,
            protein_goal: profile.proteinGoal,
            carbs_goal: profile.carbsGoal,
            fat_goal: profile.fatGoal,
            fiber_goal: profile.fiberGoal,
          },
        ]
      : [];

    const nutrients = days.map((d) => ({
      diary_id: d.diary_id,
      serving: d.serving,
      protein: d.protein,
      carbs: d.carbs,
      fat: d.fat,
      fiber: d.fiber,
    }));

    return { profile, prefs, days, nutrients, plans };
  },

  // Tạo hoặc cập nhật chiều cao, cân nặng và mục tiêu sức khỏe.
  async upsertProfile(userId, { height, weight, goal }, db = prisma) {
    const numericUserId = Number(userId);
    return db.healthProfile.upsert({
      where: { user_id: numericUserId },
      create: { user_id: numericUserId, height, weight, health_goal: goal },
      update: { height, weight, health_goal: goal },
    });
  },

  // Tạo hoặc cập nhật mục tiêu calo và mục tiêu trong hồ sơ.
  async upsertProfilePreferences(userId, calorieGoal, goal, db = prisma) {
    const numericUserId = Number(userId);
    return db.healthProfile.upsert({
      where: { user_id: numericUserId },
      create: { user_id: numericUserId, calorieGoal, goal },
      update: { calorieGoal, goal },
    });
  },

  // Tìm công thức kèm nguyên liệu (để tính dinh dưỡng).
  async findRecipeById(recipeId, db = prisma) {
    return db.recipe.findUnique({
      where: { recipe_id: Number(recipeId) },
      include: { recipe_ingredients: { include: { ingredient: true } } },
    });
  },

  // Tạo một mục nhật ký ăn uống.
  async createFoodDiary(data, db = prisma) {
    return db.foodDiary.create({ data });
  },

  // Ghi giá trị dinh dưỡng cho mục nhật ký; thiếu giá trị thì mặc định 0.
  async insertDiaryNutrients(diaryId, { serving, protein, carbs, fat, fiber = 0 }, db = prisma) {
    return db.foodDiary.update({
      where: { diary_id: Number(diaryId) },
      data: {
        serving: serving || null,
        protein: protein ?? 0,
        carbs: carbs ?? 0,
        fat: fat ?? 0,
        fiber: fiber ?? 0,
      },
    });
  },

  // Xóa mục nhật ký của chính người dùng (lọc kèm user_id để không xóa được của người khác).
  async deleteFoodDiary(diaryId, userId, db = prisma) {
    return db.foodDiary.deleteMany({
      where: {
        diary_id: Number(diaryId),
        user_id: Number(userId),
      },
    });
  },

  // Tìm kế hoạch tuần theo ngày bắt đầu.
  async findMealPlanByStartDate(userId, startDate, db = prisma) {
    return db.mealPlan.findFirst({
      where: {
        user_id: Number(userId),
        start_date: startDate,
      },
    });
  },

  // Tạo kế hoạch bữa ăn.
  async createMealPlan(data, db = prisma) {
    return db.mealPlan.create({ data });
  },

  // Cập nhật kế hoạch bữa ăn.
  async updateMealPlan(planId, data, db = prisma) {
    return db.mealPlan.update({ where: { plan_id: planId }, data });
  },

  // Tạo nhiều chi tiết kế hoạch cùng lúc.
  async createMealPlanDetails(data, db = prisma) {
    return db.mealPlanDetail.createMany({ data });
  },

  // Xóa chi tiết kế hoạch theo điều kiện.
  async deleteMealPlanDetails(where, db = prisma) {
    return db.mealPlanDetail.deleteMany({ where });
  },

  // Tạo một chi tiết kế hoạch.
  async createMealPlanDetail(data, db = prisma) {
    return db.mealPlanDetail.create({ data });
  },

  // Advisory lock theo người dùng + ngày trong transaction để các thao tác đồng thời trên cùng ngày được tuần tự hóa.
  async lockUserDate(userId, dateString, db = prisma) {
    return db.$executeRaw`SELECT pg_advisory_xact_lock(${Number(userId)}::integer, hashtext(${dateString}))`;
  },

  // Đếm số mục nhật ký của người dùng trong một ngày.
  async countDiariesOnDate(userId, date, db = prisma) {
    return db.foodDiary.count({
      where: {
        user_id: Number(userId),
        consumed_date: date,
      },
    });
  },

  // Lấy các kế hoạch bữa ăn bao phủ một ngày, kế hoạch mới nhất trước.
  async findPlansForDate(userId, day, db = prisma) {
    return db.mealPlan.findMany({
      where: {
        user_id: Number(userId),
        start_date: { lte: day },
        end_date: { gte: day },
      },
      orderBy: { plan_id: 'desc' },
      include: {
        details: {
          include: {
            recipe: {
              include: {
                recipe_ingredients: { include: { ingredient: true } },
              },
            },
          },
        },
      },
    });
  },

  // Tìm chế độ ăn theo ID.
  async findDietTypeById(dietTypeId, db = prisma) {
    return db.dietType.findUnique({
      where: { diet_type_id: Number(dietTypeId) },
    });
  },

  // Cập nhật chi tiết nhà hàng; hỗ trợ cả kiểu gọi cũ (id, city, db) lẫn kiểu mới (object, db) để tương thích.
  async insertRestaurantDetails(restaurantIdOrData, cityArg, dbArg) {
    let restaurantId;
    let city;
    let hours = null;
    let priceRange = null;
    let separateKitchen = null;
    let db = prisma;

    if (typeof restaurantIdOrData === 'object' && restaurantIdOrData !== null) {
      restaurantId = restaurantIdOrData.restaurantId;
      city = restaurantIdOrData.city;
      hours = restaurantIdOrData.hours ?? null;
      priceRange = restaurantIdOrData.priceRange ?? null;
      separateKitchen = restaurantIdOrData.separateKitchen ?? null;
      db = cityArg || prisma;
    } else {
      restaurantId = restaurantIdOrData;
      city = cityArg;
      db = dbArg || prisma;
    }

    return db.restaurant.update({
      where: { restaurant_id: Number(restaurantId) },
      data: {
        city: city || null,
        hours: hours || null,
        priceRange: priceRange || null,
        separateKitchen: separateKitchen ?? false,
      },
    });
  },

  // Thêm đánh giá nhà hàng bằng SQL thô có tham số hóa.
  async insertRestaurantReview(restaurantId, userId, stars, content, db = prisma) {
    return db.$executeRaw`
      INSERT INTO restaurant_reviews(restaurant_id, user_id, stars, content)
      VALUES(${Number(restaurantId)}, ${Number(userId)}, ${stars}, ${content})
    `;
  },

  // Tính điểm sao trung bình của nhà hàng.
  async calculateAvgRestaurantStars(restaurantId, db = prisma) {
    return db.$queryRaw`
      SELECT AVG(stars)::real AS rating
      FROM restaurant_reviews
      WHERE restaurant_id = ${Number(restaurantId)}
    `;
  },

  // Lấy ảnh nguyên liệu (dữ liệu nhị phân và MIME type).
  async getIngredientImage(ingredientId, db = prisma) {
    return db.$queryRaw`
      SELECT mime_type, image_data, source_url
      FROM ingredient_images
      WHERE ingredient_id = ${Number(ingredientId)}
    `;
  },

  // Lấy danh sách công thức; mặc định kèm danh mục, chế độ ăn và nguyên liệu.
  async findRecipes({ where = {}, skip, take, include, orderBy } = {}, db = prisma) {
    return db.recipe.findMany({
      where,
      skip,
      take,
      include: include || {
        categories: true,
        diet_type: true,
        recipe_ingredients: { include: { ingredient: true } },
      },
      orderBy: orderBy || { recipe_id: 'asc' },
    });
  },

  // Đếm công thức.
  async countRecipes(where = {}, db = prisma) {
    return db.recipe.count({ where });
  },

  // Lấy danh sách nguyên liệu.
  async findIngredients({ where = {}, skip, take, orderBy } = {}, db = prisma) {
    return db.ingredient.findMany({
      where,
      skip,
      take,
      orderBy: orderBy || { ingredient_id: 'asc' },
    });
  },

  // Đếm nguyên liệu.
  async countIngredients(where = {}, db = prisma) {
    return db.ingredient.count({ where });
  },

  // Đếm nhà hàng.
  async countRestaurants(where = {}, db = prisma) {
    return db.restaurant.count({ where });
  },
};
