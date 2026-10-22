-- D:/SWP391/SWP391/server/prisma/migrations/0_recovered_baseline/migration.sql
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AiGenerationStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."AiGenerationType" AS ENUM ('CHAT', 'MEAL_PLAN');

-- CreateTable
CREATE TABLE "public"."ai_generations" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "public"."AiGenerationType" NOT NULL,
    "status" "public"."AiGenerationStatus" NOT NULL DEFAULT 'PROCESSING',
    "model_name" VARCHAR(100) NOT NULL,
    "request_payload" JSONB NOT NULL,
    "prompt_messages" JSONB NOT NULL,
    "response_payload" JSONB,
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_logs" (
    "log_id" SERIAL NOT NULL,
    "model_name" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "error_feedback" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "public"."blogs" (
    "post_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "attached_video_id" INTEGER,

    CONSTRAINT "blogs_pkey" PRIMARY KEY ("post_id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "category_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "public"."comments" (
    "comment_id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "is_flagged_by_ai" BOOLEAN DEFAULT false,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "public"."diary_nutrients" (
    "diary_id" INTEGER NOT NULL,
    "serving" TEXT NOT NULL DEFAULT '1 phần',
    "protein" REAL NOT NULL DEFAULT 0,
    "carbs" REAL NOT NULL DEFAULT 0,
    "fat" REAL NOT NULL DEFAULT 0,
    "fiber" REAL NOT NULL DEFAULT 0,

    CONSTRAINT "diary_nutrients_pkey" PRIMARY KEY ("diary_id")
);

-- CreateTable
CREATE TABLE "public"."diet_types" (
    "diet_type_id" SMALLSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,

    CONSTRAINT "diet_types_pkey" PRIMARY KEY ("diet_type_id")
);

-- CreateTable
CREATE TABLE "public"."food_diaries" (
    "diary_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "consumed_date" DATE DEFAULT CURRENT_DATE,
    "meal_type" VARCHAR(30) NOT NULL,
    "recipe_id" INTEGER,
    "custom_food_name" VARCHAR(255),
    "calories" REAL DEFAULT 0,

    CONSTRAINT "food_diaries_pkey" PRIMARY KEY ("diary_id")
);

-- CreateTable
CREATE TABLE "public"."guest_quota" (
    "guest_id" VARCHAR(100) NOT NULL,
    "quota_date" DATE NOT NULL,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_quota_pkey" PRIMARY KEY ("guest_id","quota_date")
);

-- CreateTable
CREATE TABLE "public"."health_histories" (
    "history_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "recorded_date" DATE DEFAULT CURRENT_DATE,
    "weight" REAL NOT NULL,
    "bmi" REAL,

    CONSTRAINT "health_histories_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "public"."health_profiles" (
    "profile_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "diet_type_id" SMALLINT,
    "height" REAL,
    "weight" REAL,
    "dob" DATE,
    "gender" VARCHAR(20),
    "health_goal" VARCHAR(255),

    CONSTRAINT "health_profiles_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "public"."ingredient_alternatives" (
    "id" VARCHAR(40) NOT NULL,
    "chip" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "original" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "alternatives" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,

    CONSTRAINT "ingredient_alternatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ingredient_details" (
    "ingredient_id" INTEGER NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "origin" TEXT NOT NULL,
    "plant" BOOLEAN,
    "description" TEXT NOT NULL,
    "cooking" TEXT NOT NULL,
    "aliases" TEXT NOT NULL DEFAULT '',
    "image_url" TEXT,

    CONSTRAINT "ingredient_details_pkey" PRIMARY KEY ("ingredient_id")
);

-- CreateTable
CREATE TABLE "public"."ingredient_images" (
    "ingredient_id" INTEGER NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "image_data" BYTEA NOT NULL,
    "attribution" TEXT,
    "source_url" TEXT,
    "license" TEXT,
    "license_text" TEXT,

    CONSTRAINT "ingredient_images_pkey" PRIMARY KEY ("ingredient_id")
);

-- CreateTable
CREATE TABLE "public"."ingredients" (
    "ingredient_id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "calories_per_100g" REAL DEFAULT 0,
    "protein" REAL DEFAULT 0,
    "fat" REAL DEFAULT 0,
    "carbs" REAL DEFAULT 0,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("ingredient_id")
);

-- CreateTable
CREATE TABLE "public"."meal_plan_details" (
    "plan_detail_id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "recipe_id" INTEGER,
    "meal_type" VARCHAR(30) NOT NULL,
    "day_of_week" SMALLINT NOT NULL,

    CONSTRAINT "meal_plan_details_pkey" PRIMARY KEY ("plan_detail_id")
);

-- CreateTable
CREATE TABLE "public"."meal_plans" (
    "plan_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL DEFAULT 'Thực đơn tuần',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "target_calories" REAL,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "notification_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "public"."post_categories" (
    "post_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "post_categories_pkey" PRIMARY KEY ("post_id","category_id")
);

-- CreateTable
CREATE TABLE "public"."post_votes" (
    "user_id" INTEGER NOT NULL,
    "post_id" INTEGER NOT NULL,
    "vote_type" VARCHAR(20) NOT NULL,

    CONSTRAINT "post_votes_pkey" PRIMARY KEY ("user_id","post_id")
);

-- CreateTable
CREATE TABLE "public"."posts" (
    "post_id" SERIAL NOT NULL,
    "author_id" INTEGER NOT NULL,
    "post_type" VARCHAR(20) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "posts_pkey" PRIMARY KEY ("post_id")
);

-- CreateTable
CREATE TABLE "public"."profile_preferences" (
    "user_id" INTEGER NOT NULL,
    "calorie_goal" REAL,
    "goal" TEXT,
    "protein_goal" REAL DEFAULT 70,
    "carbs_goal" REAL DEFAULT 230,
    "fat_goal" REAL DEFAULT 45,
    "fiber_goal" REAL DEFAULT 30,

    CONSTRAINT "profile_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."recipe_ingredients" (
    "recipe_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" VARCHAR(50) NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("recipe_id","ingredient_id")
);

-- CreateTable
CREATE TABLE "public"."recipes" (
    "recipe_id" SERIAL NOT NULL,
    "post_id" INTEGER,
    "category_id" INTEGER,
    "diet_type_id" SMALLINT,
    "recipe_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "prep_time" INTEGER DEFAULT 0,
    "total_calories" REAL DEFAULT 0,
    "instructions" TEXT,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("recipe_id")
);

-- CreateTable
CREATE TABLE "public"."reports" (
    "report_id" SERIAL NOT NULL,
    "reporter_id" INTEGER NOT NULL,
    "post_id" INTEGER,
    "comment_id" INTEGER,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "public"."restaurant_details" (
    "restaurant_id" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "hours" TEXT,
    "price_range" TEXT,
    "separate_kitchen" BOOLEAN,

    CONSTRAINT "restaurant_details_pkey" PRIMARY KEY ("restaurant_id")
);

-- CreateTable
CREATE TABLE "public"."restaurant_menu_prices" (
    "restaurant_id" INTEGER NOT NULL,
    "recipe_id" INTEGER NOT NULL,
    "price" INTEGER,

    CONSTRAINT "restaurant_menu_prices_pkey" PRIMARY KEY ("restaurant_id","recipe_id")
);

-- CreateTable
CREATE TABLE "public"."restaurant_recipes" (
    "restaurant_id" INTEGER NOT NULL,
    "recipe_id" INTEGER NOT NULL,

    CONSTRAINT "restaurant_recipes_pkey" PRIMARY KEY ("restaurant_id","recipe_id")
);

-- CreateTable
CREATE TABLE "public"."restaurant_reviews" (
    "review_id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "stars" SMALLINT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_reviews_pkey" PRIMARY KEY ("review_id")
);

-- CreateTable
CREATE TABLE "public"."restaurants" (
    "restaurant_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "image_url" VARCHAR(500),
    "rating" REAL DEFAULT 4.5,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "diet_type_id" SMALLINT,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("restaurant_id")
);

-- CreateTable
CREATE TABLE "public"."user_allergies" (
    "user_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,

    CONSTRAINT "user_allergies_pkey" PRIMARY KEY ("user_id","ingredient_id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "user_id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "role" SMALLINT NOT NULL DEFAULT 2,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."videos" (
    "post_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "video_url" VARCHAR(500) NOT NULL,
    "thumbnail_url" VARCHAR(500),
    "duration" INTEGER DEFAULT 0,
    "transcript" TEXT,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("post_id")
);

-- CreateIndex
CREATE INDEX "idx_ai_generations_user_created_at" ON "public"."ai_generations"("user_id" ASC, "created_at" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "idx_ai_generations_user_type_status_created_at" ON "public"."ai_generations"("user_id" ASC, "type" ASC, "status" ASC, "created_at" ASC, "id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "public"."categories"("name" ASC);

-- CreateIndex
CREATE INDEX "idx_comments_deleted_at" ON "public"."comments"("status" ASC, "deleted_at" ASC);

-- CreateIndex
CREATE INDEX "idx_comments_post" ON "public"."comments"("post_id" ASC);

-- CreateIndex
CREATE INDEX "idx_comments_user" ON "public"."comments"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "diet_types_name_key" ON "public"."diet_types"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "health_profiles_user_id_key" ON "public"."health_profiles"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_name_key" ON "public"."ingredients"("name" ASC);

-- CreateIndex
CREATE INDEX "idx_posts_author" ON "public"."posts"("author_id" ASC);

-- CreateIndex
CREATE INDEX "idx_posts_deleted_at" ON "public"."posts"("status" ASC, "deleted_at" ASC);

-- CreateIndex
CREATE INDEX "idx_posts_status" ON "public"."posts"("status" ASC);

-- CreateIndex
CREATE INDEX "restaurant_reviews_place_idx" ON "public"."restaurant_reviews"("restaurant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_users_deleted_at" ON "public"."users"("status" ASC, "deleted_at" ASC);

-- CreateIndex
CREATE INDEX "idx_users_email" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."ai_generations" ADD CONSTRAINT "ai_generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blogs" ADD CONSTRAINT "blogs_attached_video_id_fkey" FOREIGN KEY ("attached_video_id") REFERENCES "public"."videos"("post_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."blogs" ADD CONSTRAINT "blogs_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."diary_nutrients" ADD CONSTRAINT "diary_nutrients_diary_id_fkey" FOREIGN KEY ("diary_id") REFERENCES "public"."food_diaries"("diary_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."food_diaries" ADD CONSTRAINT "food_diaries_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("recipe_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."food_diaries" ADD CONSTRAINT "food_diaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."health_histories" ADD CONSTRAINT "health_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."health_profiles" ADD CONSTRAINT "health_profiles_diet_type_id_fkey" FOREIGN KEY ("diet_type_id") REFERENCES "public"."diet_types"("diet_type_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."health_profiles" ADD CONSTRAINT "health_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ingredient_details" ADD CONSTRAINT "ingredient_details_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("ingredient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ingredient_images" ADD CONSTRAINT "ingredient_images_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("ingredient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."meal_plan_details" ADD CONSTRAINT "meal_plan_details_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."meal_plans"("plan_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."meal_plan_details" ADD CONSTRAINT "meal_plan_details_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("recipe_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."meal_plans" ADD CONSTRAINT "meal_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."post_categories" ADD CONSTRAINT "post_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."post_categories" ADD CONSTRAINT "post_categories_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."post_votes" ADD CONSTRAINT "post_votes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."post_votes" ADD CONSTRAINT "post_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."profile_preferences" ADD CONSTRAINT "profile_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("ingredient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("recipe_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."recipes" ADD CONSTRAINT "recipes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."recipes" ADD CONSTRAINT "recipes_diet_type_id_fkey" FOREIGN KEY ("diet_type_id") REFERENCES "public"."diet_types"("diet_type_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."recipes" ADD CONSTRAINT "recipes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("comment_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."restaurant_details" ADD CONSTRAINT "restaurant_details_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("restaurant_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."restaurant_menu_prices" ADD CONSTRAINT "restaurant_menu_prices_restaurant_id_recipe_id_fkey" FOREIGN KEY ("restaurant_id", "recipe_id") REFERENCES "public"."restaurant_recipes"("restaurant_id", "recipe_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."restaurant_recipes" ADD CONSTRAINT "restaurant_recipes_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("recipe_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."restaurant_recipes" ADD CONSTRAINT "restaurant_recipes_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("restaurant_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."restaurant_reviews" ADD CONSTRAINT "restaurant_reviews_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("restaurant_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."restaurant_reviews" ADD CONSTRAINT "restaurant_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."restaurants" ADD CONSTRAINT "restaurants_diet_type_id_fkey" FOREIGN KEY ("diet_type_id") REFERENCES "public"."diet_types"("diet_type_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_allergies" ADD CONSTRAINT "user_allergies_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("ingredient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_allergies" ADD CONSTRAINT "user_allergies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."videos" ADD CONSTRAINT "videos_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE CASCADE ON UPDATE NO ACTION;

