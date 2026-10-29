// d:\Projects\FPT\SWP391\server\src\repositories\workspace.repository.js
import prisma from '../config/prisma.js';

export const workspaceRepository = {
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
      placeDetails,
      reviews,
      prices,
    ] = await Promise.all([
      db.dietType.findMany({ orderBy: { diet_type_id: 'asc' } }),
      db.category.findMany({ orderBy: { category_id: 'asc' } }),
      db.ingredient.findMany({ orderBy: { ingredient_id: 'asc' } }),
      db.$queryRaw`SELECT * FROM ingredient_details`,
      db.$queryRaw`SELECT * FROM ingredient_alternatives ORDER BY id`,
      db.recipe.findMany({
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
      db.restaurant.findMany({ include: { restaurant_recipes: { include: { recipe: true } } } }),
      db.$queryRaw`SELECT * FROM restaurant_details`,
      db.$queryRaw`SELECT r.review_id, r.restaurant_id, r.stars, r.content, r.created_at, u.full_name FROM restaurant_reviews r JOIN users u USING(user_id) ORDER BY r.created_at DESC`,
      db.$queryRaw`SELECT * FROM restaurant_menu_prices`,
    ]);

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
          type: a.file_type,
          name: a.file_name,
        })),
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

  async fetchJournalData(userId, db = prisma) {
    const numericUserId = Number(userId);
    const [profile, prefs, days, nutrients, plans] = await Promise.all([
      db.healthProfile.findUnique({ where: { user_id: numericUserId } }),
      db.$queryRaw`SELECT * FROM profile_preferences WHERE user_id=${numericUserId}`,
      db.foodDiary.findMany({
        where: { user_id: numericUserId },
        include: { recipe: true },
        orderBy: { consumed_date: 'desc' },
      }),
      db.$queryRaw`SELECT n.* FROM diary_nutrients n JOIN food_diaries d USING(diary_id) WHERE d.user_id=${numericUserId}`,
      db.mealPlan.findMany({
        where: { user_id: numericUserId },
        include: { details: true },
      }),
    ]);

    return { profile, prefs, days, nutrients, plans };
  },

  async upsertProfile(userId, { height, weight, goal }, db = prisma) {
    const numericUserId = Number(userId);
    return db.healthProfile.upsert({
      where: { user_id: numericUserId },
      create: { user_id: numericUserId, height, weight, health_goal: goal },
      update: { height, weight, health_goal: goal },
    });
  },

  async upsertProfilePreferences(userId, calorieGoal, goal, db = prisma) {
    const numericUserId = Number(userId);
    return db.$executeRaw`
      INSERT INTO profile_preferences(user_id, calorie_goal, goal)
      VALUES(${numericUserId}, ${calorieGoal}, ${goal})
      ON CONFLICT(user_id) DO UPDATE SET
        calorie_goal = EXCLUDED.calorie_goal,
        goal = EXCLUDED.goal
    `;
  },

  async findRecipeById(recipeId, db = prisma) {
    return db.recipe.findUnique({
      where: { recipe_id: Number(recipeId) },
      include: { recipe_ingredients: { include: { ingredient: true } } },
    });
  },

  async createFoodDiary(data, db = prisma) {
    return db.foodDiary.create({ data });
  },

  async insertDiaryNutrients(diaryId, { serving, protein, carbs, fat, fiber = 0 }, db = prisma) {
    return db.$executeRaw`
      INSERT INTO diary_nutrients(diary_id, serving, protein, carbs, fat, fiber)
      VALUES(${Number(diaryId)}, ${serving}, ${protein}, ${carbs}, ${fat}, ${fiber})
    `;
  },

  async deleteFoodDiary(diaryId, userId, db = prisma) {
    return db.foodDiary.deleteMany({
      where: {
        diary_id: Number(diaryId),
        user_id: Number(userId),
      },
    });
  },

  async findMealPlanByStartDate(userId, startDate, db = prisma) {
    return db.mealPlan.findFirst({
      where: {
        user_id: Number(userId),
        start_date: startDate,
      },
    });
  },

  async createMealPlan(data, db = prisma) {
    return db.mealPlan.create({ data });
  },

  async updateMealPlan(planId, data, db = prisma) {
    return db.mealPlan.update({ where: { plan_id: planId }, data });
  },

  async createMealPlanDetails(data, db = prisma) {
    return db.mealPlanDetail.createMany({ data });
  },

  async deleteMealPlanDetails(where, db = prisma) {
    return db.mealPlanDetail.deleteMany({ where });
  },

  async createMealPlanDetail(data, db = prisma) {
    return db.mealPlanDetail.create({ data });
  },

  async lockUserDate(userId, dateString, db = prisma) {
    return db.$executeRaw`SELECT pg_advisory_xact_lock(${Number(userId)}::integer, hashtext(${dateString}))`;
  },

  async countDiariesOnDate(userId, date, db = prisma) {
    return db.foodDiary.count({
      where: {
        user_id: Number(userId),
        consumed_date: date,
      },
    });
  },

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

  async findDietTypeById(dietTypeId, db = prisma) {
    return db.dietType.findUnique({
      where: { diet_type_id: Number(dietTypeId) },
    });
  },

  async insertRestaurantDetails(restaurantId, city, db = prisma) {
    return db.$executeRaw`
      INSERT INTO restaurant_details(restaurant_id, city)
      VALUES(${Number(restaurantId)}, ${city})
    `;
  },

  async insertRestaurantReview(restaurantId, userId, stars, content, db = prisma) {
    return db.$executeRaw`
      INSERT INTO restaurant_reviews(restaurant_id, user_id, stars, content)
      VALUES(${Number(restaurantId)}, ${Number(userId)}, ${stars}, ${content})
    `;
  },

  async calculateAvgRestaurantStars(restaurantId, db = prisma) {
    return db.$queryRaw`
      SELECT AVG(stars)::real AS rating
      FROM restaurant_reviews
      WHERE restaurant_id = ${Number(restaurantId)}
    `;
  },

  async getIngredientImage(ingredientId, db = prisma) {
    return db.$queryRaw`
      SELECT mime_type, image_data, source_url
      FROM ingredient_images
      WHERE ingredient_id = ${Number(ingredientId)}
    `;
  },

  async findRecipes({ where = {}, skip, take, include, orderBy } = {}, db = prisma) {
    return db.recipe.findMany({
      where,
      skip,
      take,
      include: include || {
        category: true,
        diet_type: true,
        recipe_ingredients: { include: { ingredient: true } },
      },
      orderBy: orderBy || { recipe_id: 'asc' },
    });
  },

  async countRecipes(where = {}, db = prisma) {
    return db.recipe.count({ where });
  },

  async findIngredients({ where = {}, skip, take, orderBy } = {}, db = prisma) {
    return db.ingredient.findMany({
      where,
      skip,
      take,
      orderBy: orderBy || { ingredient_id: 'asc' },
    });
  },

  async countIngredients(where = {}, db = prisma) {
    return db.ingredient.count({ where });
  },

  async countRestaurants(where = {}, db = prisma) {
    return db.restaurant.count({ where });
  },
};
