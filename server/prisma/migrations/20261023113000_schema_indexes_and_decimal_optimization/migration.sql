-- d:\Projects\FPT\SWP391\server\prisma\migrations\20261023113000_schema_indexes_and_decimal_optimization\migration.sql
-- AlterTable
ALTER TABLE "restaurant_menu_prices" ALTER COLUMN "price" SET DATA TYPE DECIMAL(18,2);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_food_diaries_user_date" ON "food_diaries"("user_id", "consumed_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_meal_plan_details_plan" ON "meal_plan_details"("plan_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_meal_plans_user_start_date" ON "meal_plans"("user_id", "start_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_post_categories_category" ON "post_categories"("category_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_recipe_ingredients_ingredient" ON "recipe_ingredients"("ingredient_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_recipes_post" ON "recipes"("post_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_recipes_category" ON "recipes"("category_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_recipes_diet_type" ON "recipes"("diet_type_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_reports_reporter" ON "reports"("reporter_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_reports_post" ON "reports"("post_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_reports_comment" ON "reports"("comment_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_reports_status" ON "reports"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_restaurant_reviews_user" ON "restaurant_reviews"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_restaurants_coordinates" ON "restaurants"("latitude", "longitude");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_restaurants_diet_type" ON "restaurants"("diet_type_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_user_allergies_ingredient" ON "user_allergies"("ingredient_id");
