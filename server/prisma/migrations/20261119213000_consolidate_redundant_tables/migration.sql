-- server/prisma/migrations/20261119213000_consolidate_redundant_tables/migration.sql

-- 1. Consolidate restaurant_details into restaurants
ALTER TABLE "restaurants" 
ADD COLUMN IF NOT EXISTS "city" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "hours" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "price_range" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "separate_kitchen" BOOLEAN NOT NULL DEFAULT false;

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'restaurant_details') THEN
        UPDATE "restaurants" r 
        SET "city" = d."city", 
            "hours" = d."hours", 
            "price_range" = d."price_range", 
            "separate_kitchen" = COALESCE(d."separate_kitchen", false) 
        FROM "restaurant_details" d 
        WHERE r."restaurant_id" = d."restaurant_id";
        
        DROP TABLE "restaurant_details";
    END IF;
END $$;

-- 2. Consolidate restaurant_menu_prices into restaurant_recipes
ALTER TABLE "restaurant_recipes" 
ADD COLUMN IF NOT EXISTS "price" DECIMAL(18, 2);

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'restaurant_menu_prices') THEN
        UPDATE "restaurant_recipes" rr 
        SET "price" = p."price" 
        FROM "restaurant_menu_prices" p 
        WHERE rr."restaurant_id" = p."restaurant_id" AND rr."recipe_id" = p."recipe_id";
        
        DROP TABLE "restaurant_menu_prices";
    END IF;
END $$;

-- 3. Consolidate diary_nutrients into food_diaries
ALTER TABLE "food_diaries" 
ADD COLUMN IF NOT EXISTS "serving" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "protein" REAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "carbs" REAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "fat" REAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "fiber" REAL DEFAULT 0;

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'diary_nutrients') THEN
        UPDATE "food_diaries" fd 
        SET "serving" = n."serving", 
            "protein" = n."protein", 
            "carbs" = n."carbs", 
            "fat" = n."fat", 
            "fiber" = n."fiber" 
        FROM "diary_nutrients" n 
        WHERE fd."diary_id" = n."diary_id";
        
        DROP TABLE "diary_nutrients";
    END IF;
END $$;

-- 4. Consolidate liquid_ingredient_densities into ingredients
ALTER TABLE "ingredients" 
ADD COLUMN IF NOT EXISTS "density" REAL;

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'liquid_ingredient_densities') THEN
        UPDATE "ingredients" i 
        SET "density" = d."density" 
        FROM "liquid_ingredient_densities" d 
        WHERE i."ingredient_id" = d."ingredient_id";
        
        DROP TABLE "liquid_ingredient_densities";
    END IF;
END $$;

-- 5. Consolidate profile_preferences into health_profiles
ALTER TABLE "health_profiles" 
ADD COLUMN IF NOT EXISTS "calorie_goal" REAL,
ADD COLUMN IF NOT EXISTS "goal" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "protein_goal" REAL,
ADD COLUMN IF NOT EXISTS "carbs_goal" REAL,
ADD COLUMN IF NOT EXISTS "fat_goal" REAL,
ADD COLUMN IF NOT EXISTS "fiber_goal" REAL;

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profile_preferences') THEN
        UPDATE "health_profiles" hp 
        SET "calorie_goal" = pp."calorie_goal", 
            "goal" = pp."goal", 
            "protein_goal" = pp."protein_goal", 
            "carbs_goal" = pp."carbs_goal", 
            "fat_goal" = pp."fat_goal", 
            "fiber_goal" = pp."fiber_goal" 
        FROM "profile_preferences" pp 
        WHERE hp."user_id" = pp."user_id";
        
        DROP TABLE "profile_preferences";
    END IF;
END $$;

-- 6. Consolidate video_recipe_summaries into video_recipe_summary_jobs
ALTER TABLE "video_recipe_summary_jobs" 
ADD COLUMN IF NOT EXISTS "recipe" JSONB;

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'video_recipe_summaries') THEN
        UPDATE "video_recipe_summary_jobs" j 
        SET "recipe" = s."recipe" 
        FROM "video_recipe_summaries" s 
        WHERE j."id" = s."job_id";
        
        DROP TABLE "video_recipe_summaries";
    END IF;
END $$;
